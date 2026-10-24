import "server-only";
import { and, eq, gte, ilike, isNull, lte, ne, exists, sql } from "drizzle-orm";
import type { Actor } from "@/modules/firms";
import { company } from "@/modules/companies/schema";
import { addCalendarDays } from "@/lib/work-dates";
import { task, taskReview } from "../schema";
import type { TaskQuery } from "../contracts";
export function taskWhere(actor: Actor, query: TaskQuery, today: string) {
  return and(
    eq(task.firmId, actor.firmId),
    query.companyId ? eq(task.companyId, query.companyId) : undefined,
    query.obligationId ? eq(task.obligationId, query.obligationId) : undefined,
    query.assigneeId === "me"
      ? eq(task.assigneeId, actor.userId)
      : query.assigneeId === "unassigned"
        ? isNull(task.assigneeId)
        : query.assigneeId
          ? eq(task.assigneeId, query.assigneeId)
          : undefined,
    query.status !== "all" ? eq(task.status, query.status) : undefined,
    query.priority !== "all" ? eq(task.priority, query.priority) : undefined,
    query.archived === "active" ? isNull(company.archivedAt) : undefined,
    query.q
      ? ilike(task.title, `%${query.q.replace(/[\\%_]/g, "\\$&")}%`)
      : undefined,
    query.due === "overdue"
      ? and(
          ne(task.status, "completed"),
          lte(task.dueDate, addCalendarDays(today, -1)),
        )
      : undefined,
    query.due === "upcoming"
      ? and(
          ne(task.status, "completed"),
          gte(task.dueDate, today),
          lte(task.dueDate, addCalendarDays(today, 7)),
        )
      : undefined,
  );
}

export function pendingReviewWhere(actor: Actor) {
  if (actor.role === "staff") return sql`false`;
  return and(
    eq(task.firmId, actor.firmId),
    eq(task.status, "submitted_for_review"),
    exists(
      sql`select 1 from ${taskReview} where ${taskReview.firmId} = ${actor.firmId} and ${taskReview.taskId} = ${task.id} and ${taskReview.reviewerId} = ${actor.userId} and ${taskReview.outcome} = 'pending' and ${taskReview.submittedVersion} = ${task.version} - 1`,
    ),
  );
}
