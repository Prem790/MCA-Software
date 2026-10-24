import "server-only";
import { and, eq, gte, ilike, isNull, lte } from "drizzle-orm";
import { company } from "@/modules/companies/schema";
import { addCalendarDays } from "@/lib/work-dates";
import { obligation } from "../schema";
import type { ObligationQuery } from "../contracts";
export function obligationWhere(
  firmId: string,
  query: ObligationQuery,
  today: string,
) {
  return and(
    eq(obligation.firmId, firmId),
    query.companyId ? eq(obligation.companyId, query.companyId) : undefined,
    query.archived === "active" ? isNull(company.archivedAt) : undefined,
    query.q
      ? ilike(obligation.title, `%${query.q.replace(/[\\%_]/g, "\\$&")}%`)
      : undefined,
    query.due === "overdue"
      ? lte(obligation.dueDate, addCalendarDays(today, -1))
      : undefined,
    query.due === "upcoming"
      ? and(
          gte(obligation.dueDate, today),
          lte(obligation.dueDate, addCalendarDays(today, 7)),
        )
      : undefined,
  );
}
