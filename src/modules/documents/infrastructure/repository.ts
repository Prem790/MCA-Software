import "server-only";
import { and, count, desc, eq, gt, inArray } from "drizzle-orm";
import { lockCurrentMember, type Actor } from "@/modules/firms";
import { lockActiveCompany } from "@/modules/companies";
import { company } from "@/modules/companies/schema";
import {
  lockedTask,
  requireEditable,
  requireTaskWorker,
  touchTask,
} from "@/modules/tasks/server";
import { appendAudit } from "@/modules/audit";
import type { QueryDatabase } from "@/platform/database/types";
import { ApplicationError } from "@/platform/http/errors";
import { document } from "../schema";
import type { UploadInput } from "../contracts";

type Context = Actor & { requestId: string };
export function documentRepository(db: QueryDatabase) {
  async function writeContext(
    tx: QueryDatabase,
    context: Context,
    input: UploadInput,
  ) {
    if (input.taskId) {
      const current = await lockedTask(
        tx,
        context,
        input.taskId,
        input.version,
      );
      if (current.task.companyId !== input.companyId)
        throw new ApplicationError(
          "NOT_FOUND",
          "Task was not found in this company.",
        );
      requireTaskWorker(current.actor, current.task);
      requireEditable(current.task);
      return current;
    }
    const actor = await lockCurrentMember(tx, context);
    if (actor.role === "staff")
      throw new ApplicationError(
        "FORBIDDEN",
        "Staff may upload only to their assigned tasks.",
      );
    if (!(await lockActiveCompany(tx, actor.firmId, input.companyId)))
      throw new ApplicationError("NOT_FOUND", "Active company was not found.");
    return { actor, task: null };
  }
  const summary = {
    id: document.id,
    originalName: document.originalName,
    mediaType: document.mediaType,
    sizeBytes: document.sizeBytes,
    createdAt: document.createdAt,
    taskId: document.taskId,
  };
  return {
    async list(
      actor: Actor,
      companyId: string,
      taskId: string | undefined,
      page: number,
    ) {
      return db.transaction(async (tx) => {
        await lockCurrentMember(tx, actor);
        const [parent] = await tx
          .select({ id: company.id })
          .from(company)
          .where(
            and(eq(company.firmId, actor.firmId), eq(company.id, companyId)),
          );
        if (!parent)
          throw new ApplicationError("NOT_FOUND", "Company was not found.");
        return tx
          .select(summary)
          .from(document)
          .where(
            and(
              eq(document.firmId, actor.firmId),
              eq(document.companyId, companyId),
              eq(document.storageState, "ready"),
              taskId ? eq(document.taskId, taskId) : undefined,
            ),
          )
          .orderBy(desc(document.createdAt), desc(document.id))
          .limit(20)
          .offset((page - 1) * 20);
      });
    },
    async reserve(
      context: Context,
      input: UploadInput,
      file: {
        id: string;
        key: string;
        name: string;
        mediaType: string;
        sizeBytes: number;
        sha256: string;
      },
    ) {
      await db.transaction(async (tx) => {
        await writeContext(tx, context, input);
        const [recent] = await tx
          .select({ value: count() })
          .from(document)
          .where(
            and(
              eq(document.firmId, context.firmId),
              eq(document.uploadedBy, context.userId),
              gt(document.createdAt, new Date(Date.now() - 60000)),
            ),
          );
        if ((recent?.value ?? 0) >= 5)
          throw new ApplicationError(
            "RATE_LIMITED",
            "Upload limit reached. Wait a minute before retrying.",
          );
        const [existing] = await tx
          .select({ value: count() })
          .from(document)
          .where(
            and(
              eq(document.firmId, context.firmId),
              eq(document.companyId, input.companyId),
              inArray(document.storageState, ["pending", "ready"]),
            ),
          );
        if ((existing?.value ?? 0) >= 500)
          throw new ApplicationError(
            "CONFLICT",
            "This company's 500-document pilot limit has been reached. Contact the administrator.",
          );
        await tx.insert(document).values({
          id: file.id,
          firmId: context.firmId,
          companyId: input.companyId,
          taskId: input.taskId ?? null,
          uploadedBy: context.userId,
          objectKey: file.key,
          originalName: file.name,
          mediaType: file.mediaType,
          sizeBytes: file.sizeBytes,
          sha256: file.sha256,
          storageState: "pending",
        });
      });
    },
    async finalize(context: Context, input: UploadInput, id: string) {
      return db.transaction(async (tx) => {
        const current = await writeContext(tx, context, input);
        const [row] = await tx
          .update(document)
          .set({ storageState: "ready" })
          .where(
            and(
              eq(document.firmId, context.firmId),
              eq(document.id, id),
              eq(document.storageState, "pending"),
            ),
          )
          .returning(summary);
        if (!row)
          throw new ApplicationError(
            "CONFLICT",
            "Upload reservation is no longer available.",
          );
        if (current.task) await touchTask(tx, current.task);
        await appendAudit(tx, {
          ...context,
          actorId: context.userId,
          action: "document.uploaded",
          resourceType: current.task ? "task" : "company",
          resourceId: current.task?.id ?? input.companyId,
        });
        return row;
      });
    },
    async fail(firmId: string, id: string) {
      const rows = await db
        .update(document)
        .set({ storageState: "failed" })
        .where(
          and(
            eq(document.firmId, firmId),
            eq(document.id, id),
            eq(document.storageState, "pending"),
          ),
        )
        .returning({ id: document.id });
      return rows.length > 0;
    },
    async download(context: Context, id: string) {
      return db.transaction(async (tx) => {
        await lockCurrentMember(tx, context);
        const [row] = await tx
          .select()
          .from(document)
          .where(
            and(
              eq(document.firmId, context.firmId),
              eq(document.id, id),
              eq(document.storageState, "ready"),
            ),
          );
        if (!row)
          throw new ApplicationError("NOT_FOUND", "Document was not found.");
        await appendAudit(tx, {
          ...context,
          actorId: context.userId,
          action: "document.download_requested",
          resourceType: row.taskId ? "task" : "company",
          resourceId: row.taskId ?? row.companyId,
        });
        return row;
      });
    },
  };
}
