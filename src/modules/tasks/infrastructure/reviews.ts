import "server-only";
import { z } from "zod";
import {
  and,
  asc,
  desc,
  eq,
  isNull,
  inArray,
  getTableColumns,
} from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { membership } from "@/modules/firms/schema";
import { user } from "@/modules/identity/schema";
import { document } from "@/modules/documents/schema";
import type { QueryDatabase } from "@/platform/database/types";
import { ApplicationError } from "@/platform/http/errors";
import { task, taskChecklist, taskReview } from "../schema";
import {
  reviewSubmission,
  reviewDecision,
  type TaskContext,
} from "../contracts";
import {
  auditTask,
  lockedTask,
  requireEditable,
  requireTaskWorker,
} from "./write-context";

export function reviewRepository(db: QueryDatabase) {
  return {
    async list(firmId: string, taskId: string, page = 1) {
      z.number().int().min(1).max(10000).parse(page);
      const submitter = alias(user, "review_submitter");
      const reviewer = alias(user, "review_reviewer");
      const decider = alias(user, "review_decider");
      return db
        .select({
          ...getTableColumns(taskReview),
          submitterName: submitter.name,
          reviewerName: reviewer.name,
          deciderName: decider.name,
        })
        .from(taskReview)
        .innerJoin(submitter, eq(submitter.id, taskReview.submittedBy))
        .innerJoin(reviewer, eq(reviewer.id, taskReview.reviewerId))
        .leftJoin(decider, eq(decider.id, taskReview.decidedBy))
        .where(
          and(eq(taskReview.firmId, firmId), eq(taskReview.taskId, taskId)),
        )
        .orderBy(desc(taskReview.submittedVersion))
        .limit(10)
        .offset((page - 1) * 10);
    },
    async reviewers(firmId: string) {
      const rows = await db
        .select({ id: user.id, name: user.name, role: membership.role })
        .from(membership)
        .innerJoin(user, eq(user.id, membership.userId))
        .where(
          and(
            eq(membership.firmId, firmId),
            isNull(membership.revokedAt),
            inArray(membership.role, ["admin", "manager"]),
          ),
        )
        .orderBy(asc(user.name), asc(user.id))
        .limit(200);
      return rows;
    },
    async submit(context: TaskContext, id: string, value: unknown) {
      const input = reviewSubmission.parse(value);
      return db.transaction(async (tx) => {
        const current = await lockedTask(tx, context, id, input.version);
        requireTaskWorker(current.actor, current.task);
        requireEditable(current.task);
        const [reviewer] = await tx
          .select()
          .from(membership)
          .where(
            and(
              eq(membership.firmId, context.firmId),
              eq(membership.userId, input.reviewerId),
              isNull(membership.revokedAt),
            ),
          );
        if (
          !reviewer ||
          reviewer.role === "staff" ||
          input.reviewerId === current.actor.userId
        )
          throw new ApplicationError(
            "VALIDATION_ERROR",
            "Choose another active admin or manager to review this submission.",
          );
        const checklist = await tx
          .select({
            id: taskChecklist.id,
            title: taskChecklist.title,
            checked: taskChecklist.checked,
          })
          .from(taskChecklist)
          .where(
            and(
              eq(taskChecklist.firmId, context.firmId),
              eq(taskChecklist.taskId, id),
            ),
          )
          .orderBy(asc(taskChecklist.id));
        if (checklist.some((item) => !item.checked))
          throw new ApplicationError(
            "CONFLICT",
            "Finish the checklist before submitting for review.",
          );
        const documents = await tx
          .select({
            id: document.id,
            name: document.originalName,
            sha256: document.sha256,
          })
          .from(document)
          .where(
            and(
              eq(document.firmId, context.firmId),
              eq(document.taskId, id),
              eq(document.storageState, "ready"),
            ),
          )
          .orderBy(asc(document.id));
        const {
          title,
          description,
          dueDate,
          assigneeId,
          priority,
          obligationId,
        } = current.task;
        const [row] = await tx
          .insert(taskReview)
          .values({
            firmId: context.firmId,
            companyId: current.task.companyId,
            taskId: id,
            submittedBy: current.actor.userId,
            reviewerId: input.reviewerId,
            submittedVersion: current.task.version,
            evidence: input.evidence,
            snapshot: {
              title,
              description,
              dueDate,
              assigneeId,
              priority,
              obligationId,
              checklist,
              documents,
            },
          })
          .returning();
        await tx
          .update(task)
          .set({
            status: "submitted_for_review",
            version: current.task.version + 1,
          })
          .where(and(eq(task.firmId, context.firmId), eq(task.id, id)));
        await auditTask(tx, context, "task.review_submitted", id);
        return row;
      });
    },
    async decide(context: TaskContext, id: string, value: unknown) {
      const input = reviewDecision.parse(value);
      return db.transaction(async (tx) => {
        const current = await lockedTask(tx, context, id, input.version);
        const [review] = await tx
          .select()
          .from(taskReview)
          .where(
            and(
              eq(taskReview.firmId, context.firmId),
              eq(taskReview.taskId, id),
              eq(taskReview.id, input.reviewId),
            ),
          )
          .for("update");
        if (!review)
          throw new ApplicationError("NOT_FOUND", "Review was not found.");
        if (
          current.actor.role === "staff" ||
          review.reviewerId !== current.actor.userId ||
          review.submittedBy === current.actor.userId
        )
          throw new ApplicationError(
            "FORBIDDEN",
            "Only the assigned independent reviewer can decide this review.",
          );
        if (
          current.task.status !== "submitted_for_review" ||
          review.outcome !== "pending" ||
          current.task.version !== review.submittedVersion + 1
        )
          throw new ApplicationError(
            "CONFLICT",
            "This review is no longer pending. Refresh the task.",
          );
        await tx
          .update(taskReview)
          .set({
            outcome: input.outcome,
            feedback: input.feedback,
            decidedBy: current.actor.userId,
            decidedAt: new Date(),
          })
          .where(eq(taskReview.id, review.id));
        await tx
          .update(task)
          .set({ status: input.outcome, version: current.task.version + 1 })
          .where(and(eq(task.firmId, context.firmId), eq(task.id, id)));
        await auditTask(tx, context, `task.review_${input.outcome}`, id);
        return { outcome: input.outcome };
      });
    },
  };
}
