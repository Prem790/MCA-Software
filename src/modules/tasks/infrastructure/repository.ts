import "server-only";
import { and, count, desc, eq, gt } from "drizzle-orm";
import { lockCurrentMember } from "@/modules/firms";
import { obligation } from "@/modules/compliance/schema";
import type { QueryDatabase } from "@/platform/database/types";
import { ApplicationError } from "@/platform/http/errors";
import { task, taskChecklist, taskComment, taskReview } from "../schema";
import type { TaskRepository } from "../contracts";
import { completionIssue, mayTransition } from "../domain/work-policy";
import { taskReads } from "./read-repository";
import {
  auditTask,
  lockedTask,
  requireEditable,
  requireTaskManager,
  requireTaskWorker,
  touchTask,
  validAssignee,
  writableCompany,
} from "./write-context";

export function taskRepository(db: QueryDatabase): TaskRepository {
  return {
    ...taskReads(db),
    async create(context, input) {
      return db.transaction(async (tx) => {
        const actor = await lockCurrentMember(tx, context);
        requireTaskManager(actor);
        await writableCompany(tx, actor, input.companyId);
        await validAssignee(tx, context.firmId, input.assigneeId);
        if (input.obligationId) {
          const [linked] = await tx
            .select({
              id: obligation.id,
              confirmedAt: obligation.dueDateConfirmedAt,
            })
            .from(obligation)
            .where(
              and(
                eq(obligation.firmId, context.firmId),
                eq(obligation.companyId, input.companyId),
                eq(obligation.id, input.obligationId),
              ),
            );
          if (!linked)
            throw new ApplicationError(
              "NOT_FOUND",
              "Obligation was not found in this company.",
            );
          if (!linked.confirmedAt)
            throw new ApplicationError(
              "CONFLICT",
              "Confirm the obligation's due date before creating its task.",
            );
        }
        const [row] = await tx
          .insert(task)
          .values({ ...input, firmId: context.firmId })
          .returning();
        if (!row) throw new Error("Task creation did not return a row");
        await auditTask(tx, context, "task.created", row.id);
        return row;
      });
    },
    async update(context, id, input) {
      return db.transaction(async (tx) => {
        const current = await lockedTask(tx, context, id, input.version);
        requireTaskManager(current.actor);
        requireEditable(current.task);
        await validAssignee(tx, context.firmId, input.assigneeId);
        const [row] = await tx
          .update(task)
          .set({ ...input, version: current.task.version + 1 })
          .where(and(eq(task.id, id), eq(task.firmId, context.firmId)))
          .returning();
        if (!row) throw new Error("Task update did not return a row");
        await auditTask(tx, context, "task.updated", id);
        return row;
      });
    },
    async transition(context, id, input) {
      return db.transaction(async (tx) => {
        const current = await lockedTask(tx, context, id, input.version);
        requireTaskWorker(current.actor, current.task);
        if (
          !mayTransition(current.actor.role, current.task.status, input.status)
        )
          throw new ApplicationError(
            "FORBIDDEN",
            "This status change is not allowed. Ask an admin or manager to reopen the task.",
          );
        if (current.task.status === input.status) return current.task;
        if (input.status === "completed") {
          const [approval] = await tx
            .select()
            .from(taskReview)
            .where(
              and(
                eq(taskReview.firmId, context.firmId),
                eq(taskReview.taskId, id),
              ),
            )
            .orderBy(desc(taskReview.submittedVersion))
            .limit(1);
          if (
            !approval ||
            approval.outcome !== "approved" ||
            current.task.version !== approval.submittedVersion + 2
          )
            throw new ApplicationError(
              "CONFLICT",
              "An independent review approval is required before completion.",
            );
          const [remaining] = await tx
            .select({ total: count() })
            .from(taskChecklist)
            .where(
              and(
                eq(taskChecklist.firmId, context.firmId),
                eq(taskChecklist.taskId, id),
                eq(taskChecklist.checked, false),
              ),
            );
          const issue = completionIssue(remaining?.total ?? 0, input.evidence);
          if (issue === "checklist")
            throw new ApplicationError(
              "CONFLICT",
              "Finish all checklist items before completing this task.",
            );
          if (issue === "evidence")
            throw new ApplicationError(
              "VALIDATION_ERROR",
              "Describe the completion evidence before completing this task.",
            );
          // Keep an immutable note when a manager later reopens and clears current completion state.
          await tx.insert(taskComment).values({
            firmId: context.firmId,
            companyId: current.task.companyId,
            taskId: id,
            authorId: context.userId,
            body: `Completion note:\n${input.evidence}`,
          });
        }
        if (
          input.status === "in_progress" &&
          current.task.status === "submitted_for_review"
        ) {
          await tx
            .update(taskReview)
            .set({
              outcome: "withdrawn",
              feedback: "Task reopened by an admin or manager.",
              decidedBy: current.actor.userId,
              decidedAt: new Date(),
            })
            .where(
              and(
                eq(taskReview.firmId, context.firmId),
                eq(taskReview.taskId, id),
                eq(taskReview.outcome, "pending"),
              ),
            );
        }
        const [row] = await tx
          .update(task)
          .set({
            status: input.status,
            version: current.task.version + 1,
            completedAt: input.status === "completed" ? new Date() : null,
            completionEvidence:
              input.status === "completed" ? input.evidence : null,
          })
          .where(and(eq(task.id, id), eq(task.firmId, context.firmId)))
          .returning();
        if (!row) throw new Error("Task status update did not return a row");
        await auditTask(tx, context, `task.status.${input.status}`, id);
        return row;
      });
    },
    async addChecklist(context, id, input) {
      await db.transaction(async (tx) => {
        const current = await lockedTask(tx, context, id, input.version);
        requireTaskManager(current.actor);
        requireEditable(current.task);
        const [existing] = await tx
          .select({ total: count() })
          .from(taskChecklist)
          .where(
            and(
              eq(taskChecklist.firmId, context.firmId),
              eq(taskChecklist.taskId, id),
            ),
          );
        if ((existing?.total ?? 0) >= 50)
          throw new ApplicationError(
            "CONFLICT",
            "A task can have at most 50 checklist items.",
          );
        await tx.insert(taskChecklist).values({
          firmId: context.firmId,
          companyId: current.task.companyId,
          taskId: id,
          title: input.title,
        });
        await touchTask(tx, current.task);
        await auditTask(tx, context, "task.checklist_added", id);
      });
    },
    async toggleChecklist(context, id, itemId, input) {
      await db.transaction(async (tx) => {
        const current = await lockedTask(tx, context, id, input.version);
        requireTaskWorker(current.actor, current.task);
        requireEditable(current.task);
        const [row] = await tx
          .update(taskChecklist)
          .set({ checked: input.checked })
          .where(
            and(
              eq(taskChecklist.firmId, context.firmId),
              eq(taskChecklist.taskId, id),
              eq(taskChecklist.id, itemId),
            ),
          )
          .returning();
        if (!row)
          throw new ApplicationError(
            "NOT_FOUND",
            "Checklist item was not found.",
          );
        await touchTask(tx, current.task);
        await auditTask(
          tx,
          context,
          input.checked ? "task.checklist_checked" : "task.checklist_unchecked",
          id,
        );
      });
    },
    async removeChecklist(context, id, itemId, version) {
      await db.transaction(async (tx) => {
        const current = await lockedTask(tx, context, id, version);
        requireTaskManager(current.actor);
        requireEditable(current.task);
        const [row] = await tx
          .delete(taskChecklist)
          .where(
            and(
              eq(taskChecklist.firmId, context.firmId),
              eq(taskChecklist.taskId, id),
              eq(taskChecklist.id, itemId),
            ),
          )
          .returning();
        if (!row)
          throw new ApplicationError(
            "NOT_FOUND",
            "Checklist item was not found.",
          );
        await touchTask(tx, current.task);
        await auditTask(tx, context, "task.checklist_removed", id);
      });
    },
    async comment(context, id, body) {
      await db.transaction(async (tx) => {
        const current = await lockedTask(tx, context, id);
        requireTaskWorker(current.actor, current.task);
        requireEditable(current.task);
        const [recent] = await tx
          .select({ total: count() })
          .from(taskComment)
          .where(
            and(
              eq(taskComment.firmId, context.firmId),
              eq(taskComment.taskId, id),
              eq(taskComment.authorId, context.userId),
              gt(taskComment.createdAt, new Date(Date.now() - 60000)),
            ),
          );
        if ((recent?.total ?? 0) >= 10)
          throw new ApplicationError(
            "RATE_LIMITED",
            "Comment limit reached. Wait a minute and try again.",
          );
        await tx.insert(taskComment).values({
          firmId: context.firmId,
          companyId: current.task.companyId,
          taskId: id,
          authorId: context.userId,
          body,
        });
        await auditTask(tx, context, "task.comment_added", id);
      });
    },
  };
}
