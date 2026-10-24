import "server-only";
import { and, asc, count, eq, gte, lte, sql, type SQL } from "drizzle-orm";
import { company } from "@/modules/companies/schema";
import { membership } from "@/modules/firms/schema";
import type { Actor } from "@/modules/firms";
import { user } from "@/modules/identity/schema";
import { task } from "@/modules/tasks/schema";
import { taskWhere, pendingReviewWhere } from "@/modules/tasks/server";
import { obligation } from "@/modules/compliance/schema";
import { obligationWhere } from "@/modules/compliance";
import type { QueryDatabase } from "@/platform/database/types";
import type { ReportKind, ReportQuery, ReportRow } from "../contracts";
export const taskCompany = and(
  eq(company.firmId, task.firmId),
  eq(company.id, task.companyId),
);
export const obligationCompany = and(
  eq(company.firmId, obligation.firmId),
  eq(company.id, obligation.companyId),
);
export async function taskRows(
  db: QueryDatabase,
  where: SQL | undefined,
  limit: number,
  offset = 0,
): Promise<ReportRow[]> {
  return db
    .select({
      id: task.id,
      title: task.title,
      companyName: company.name,
      companyArchivedAt: company.archivedAt,
      dueDate: task.dueDate,
      status: task.status,
      priority: task.priority,
      assigneeId: task.assigneeId,
      assigneeName: user.name,
      assigneeRevokedAt: membership.revokedAt,
      reportingPeriod: sql<string | null>`null`,
      confirmed: sql<boolean | null>`null`,
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
    .where(where)
    .orderBy(asc(task.dueDate), asc(task.id))
    .limit(limit)
    .offset(offset);
}
export async function obligationRows(
  db: QueryDatabase,
  where: SQL | undefined,
  limit: number,
  offset = 0,
): Promise<ReportRow[]> {
  return db
    .select({
      id: obligation.id,
      title: obligation.title,
      companyName: company.name,
      companyArchivedAt: company.archivedAt,
      dueDate: obligation.dueDate,
      reportingPeriod: obligation.reportingPeriod,
      confirmed: sql<boolean>`${obligation.dueDateConfirmedAt} is not null`,
      status: sql<string | null>`null`,
      priority: sql<string | null>`null`,
      assigneeId: sql<string | null>`null`,
      assigneeName: sql<string | null>`null`,
      assigneeRevokedAt: sql<Date | null>`null`,
    })
    .from(obligation)
    .innerJoin(company, obligationCompany)
    .where(where)
    .orderBy(asc(obligation.dueDate), asc(obligation.id))
    .limit(limit)
    .offset(offset);
}
export async function rowCount(
  db: QueryDatabase,
  kind: ReportKind,
  where: SQL | undefined,
) {
  const rows =
    kind === "tasks"
      ? await db
          .select({ value: count() })
          .from(task)
          .innerJoin(company, taskCompany)
          .where(where)
      : await db
          .select({ value: count() })
          .from(obligation)
          .innerJoin(company, obligationCompany)
          .where(where);
  return rows[0]?.value ?? 0;
}
export function reportWhere(
  actor: Actor,
  kind: ReportKind,
  query: ReportQuery,
  today: string,
) {
  const date = kind === "tasks" ? task.dueDate : obligation.dueDate;
  return and(
    kind === "tasks"
      ? taskWhere(actor, query, today)
      : obligationWhere(actor.firmId, query, today),
    query.dateFrom ? gte(date, query.dateFrom) : undefined,
    query.dateTo ? lte(date, query.dateTo) : undefined,
    kind === "tasks" && query.reviewer === "me"
      ? pendingReviewWhere(actor)
      : undefined,
  );
}
