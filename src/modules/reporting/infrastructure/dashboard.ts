import "server-only";
import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  isNotNull,
  isNull,
  lt,
  lte,
  ne,
  sql,
  type SQL,
} from "drizzle-orm";
import type { Actor } from "@/modules/firms";
import { company } from "@/modules/companies/schema";
import { user } from "@/modules/identity/schema";
import { membership } from "@/modules/firms/schema";
import { pendingReviewWhere } from "@/modules/tasks/server";
import { task } from "@/modules/tasks/schema";
import { obligation } from "@/modules/compliance/schema";
import { addCalendarDays } from "@/lib/work-dates";
import type { QueryDatabase } from "@/platform/database/types";
import type { DashboardData, DashboardQuery } from "../contracts";
import { taskCompany, obligationCompany, taskRows } from "./rows";
const filteredCount = (condition: SQL | undefined) =>
  sql<number>`count(*) filter (where ${condition})`.mapWith(Number);
export async function dashboardRead(
  db: QueryDatabase,
  actor: Actor,
  query: DashboardQuery,
  today: string,
): Promise<DashboardData> {
  const base = and(
    eq(task.firmId, actor.firmId),
    isNull(company.archivedAt),
    query.companyId ? eq(task.companyId, query.companyId) : undefined,
  );
  const open = ne(task.status, "completed");
  const overdue = and(open, lt(task.dueDate, today));
  const upcoming = and(
    open,
    gte(task.dueDate, today),
    lte(task.dueDate, addCalendarDays(today, 7)),
  );
  const pending = eq(task.status, "submitted_for_review");
  const myReview = pendingReviewWhere(actor);
  const [counts] = await db
    .select({
      total: count(),
      open: filteredCount(open),
      completed: filteredCount(eq(task.status, "completed")),
      overdue: filteredCount(overdue),
      upcoming: filteredCount(upcoming),
      pendingReview: filteredCount(pending),
      changesRequested: filteredCount(eq(task.status, "changes_requested")),
      approved: filteredCount(eq(task.status, "approved")),
      waitingDocuments: filteredCount(eq(task.status, "waiting_for_documents")),
      mine: filteredCount(and(open, eq(task.assigneeId, actor.userId))),
      myReviews: filteredCount(and(pending, myReview)),
    })
    .from(task)
    .innerJoin(company, taskCompany)
    .where(base);
  const [obligations] = await db
    .select({
      total: count(),
      unconfirmed: filteredCount(isNull(obligation.dueDateConfirmedAt)),
      upcoming: filteredCount(
        and(
          isNotNull(obligation.dueDateConfirmedAt),
          gte(obligation.dueDate, today),
          lte(obligation.dueDate, addCalendarDays(today, 7)),
        ),
      ),
    })
    .from(obligation)
    .innerJoin(company, obligationCompany)
    .where(
      and(
        eq(obligation.firmId, actor.firmId),
        isNull(company.archivedAt),
        query.companyId ? eq(obligation.companyId, query.companyId) : undefined,
      ),
    );
  const workload = await db
    .select({
      assigneeId: task.assigneeId,
      name: user.name,
      revokedAt: membership.revokedAt,
      open: filteredCount(open),
      overdue: filteredCount(overdue),
      pendingReview: filteredCount(pending),
      completed: filteredCount(eq(task.status, "completed")),
    })
    .from(task)
    .innerJoin(company, taskCompany)
    .leftJoin(user, eq(user.id, task.assigneeId))
    .leftJoin(
      membership,
      and(
        eq(membership.firmId, task.firmId),
        eq(membership.userId, task.assigneeId),
      ),
    )
    .where(base)
    .groupBy(task.assigneeId, user.name, membership.revokedAt)
    .orderBy(
      desc(filteredCount(overdue)),
      desc(filteredCount(open)),
      asc(task.assigneeId),
    )
    .limit(20)
    .offset((query.page - 1) * 20);
  const [groups] = await db
    .select({
      total:
        sql<number>`count(distinct ${task.assigneeId}) + case when count(*) filter (where ${task.assigneeId} is null) > 0 then 1 else 0 end`.mapWith(
          Number,
        ),
    })
    .from(task)
    .innerJoin(company, taskCompany)
    .where(base);
  return {
    today,
    counts: counts!,
    obligations: obligations!,
    workload,
    workloadTotal: groups?.total ?? 0,
    upcoming: await taskRows(db, and(base, upcoming), 10),
    reviewQueue: await taskRows(db, and(base, pending, myReview), 10),
  };
}
