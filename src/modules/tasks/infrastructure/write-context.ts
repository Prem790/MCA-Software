import "server-only";
import { and, eq, isNull } from "drizzle-orm";
import { lockCurrentMember, type Actor } from "@/modules/firms";
import { lockActiveCompany } from "@/modules/companies";
import { membership } from "@/modules/firms/schema";
import { appendAudit } from "@/modules/audit";
import type { QueryDatabase } from "@/platform/database/types";
import { ApplicationError } from "@/platform/http/errors";
import { task } from "../schema";
import { mayWorkOnTask, isEditableWork } from "../domain/work-policy";
import type { TaskContext, TaskRecord } from "../contracts";

export function requireTaskManager(actor: Actor) {
  if (actor.role === "staff")
    throw new ApplicationError(
      "FORBIDDEN",
      "Only admins and managers can create or assign work.",
    );
}
export async function writableCompany(
  db: QueryDatabase,
  actor: Actor,
  companyId: string,
) {
  if (!(await lockActiveCompany(db, actor.firmId, companyId)))
    throw new ApplicationError("NOT_FOUND", "Active company was not found.");
}
export async function validAssignee(
  db: QueryDatabase,
  firmId: string,
  userId: string | null,
) {
  if (!userId) return;
  const [row] = await db
    .select({ id: membership.id })
    .from(membership)
    .where(
      and(
        eq(membership.firmId, firmId),
        eq(membership.userId, userId),
        isNull(membership.revokedAt),
      ),
    );
  if (!row)
    throw new ApplicationError(
      "VALIDATION_ERROR",
      "Assign work to an active member of this firm.",
    );
}
export async function lockedTask(
  db: QueryDatabase,
  context: TaskContext,
  id: string,
  version?: number,
) {
  const actor = await lockCurrentMember(db, context);
  const [initial] = await db
    .select({ companyId: task.companyId })
    .from(task)
    .where(and(eq(task.firmId, actor.firmId), eq(task.id, id)));
  if (!initial) throw new ApplicationError("NOT_FOUND", "Task was not found.");
  await writableCompany(db, actor, initial.companyId);
  const [row] = await db
    .select()
    .from(task)
    .where(and(eq(task.firmId, actor.firmId), eq(task.id, id)))
    .for("update");
  if (!row) throw new ApplicationError("NOT_FOUND", "Task was not found.");
  if (version !== undefined && row.version !== version)
    throw new ApplicationError(
      "CONFLICT",
      "This task changed. Refresh before making another change.",
    );
  return { actor, task: row };
}
export function requireEditable(record: TaskRecord) {
  if (!isEditableWork(record.status))
    throw new ApplicationError(
      "CONFLICT",
      "An admin or manager must reopen this task before editing it.",
    );
}
export function requireTaskWorker(actor: Actor, record: TaskRecord) {
  if (!mayWorkOnTask(actor.role, actor.userId, record.assigneeId))
    throw new ApplicationError(
      "FORBIDDEN",
      "Staff can update only tasks assigned to them.",
    );
}
export async function auditTask(
  db: QueryDatabase,
  context: TaskContext,
  action: string,
  id: string,
) {
  await appendAudit(db, {
    firmId: context.firmId,
    actorId: context.userId,
    requestId: context.requestId,
    resourceType: "task",
    resourceId: id,
    action,
  });
}
export async function touchTask(db: QueryDatabase, record: TaskRecord) {
  await db
    .update(task)
    .set({ version: record.version + 1 })
    .where(and(eq(task.firmId, record.firmId), eq(task.id, record.id)));
}
