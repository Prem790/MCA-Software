import "server-only";
import { and, asc, count, eq, gte, isNotNull, isNull, lte } from "drizzle-orm";
import type { Actor } from "@/modules/firms";
import { company } from "@/modules/companies/schema";
import { task } from "@/modules/tasks/schema";
import { obligation } from "@/modules/compliance/schema";
import type { QueryDatabase } from "@/platform/database/types";
import { monthDetails } from "../domain/calendar";
import type { CalendarData, CalendarQuery } from "../contracts";
import {
  taskCompany,
  obligationCompany,
  taskRows,
  obligationRows,
  rowCount,
} from "./rows";
export async function calendarRead(
  db: QueryDatabase,
  actor: Actor,
  query: CalendarQuery,
): Promise<CalendarData> {
  const range = monthDetails(query.month);
  const companies = and(
    query.companyId ? eq(company.id, query.companyId) : undefined,
    query.archived === "active" ? isNull(company.archivedAt) : undefined,
  );
  const taskScope = and(
    eq(task.firmId, actor.firmId),
    companies,
    gte(task.dueDate, range.first),
    lte(task.dueDate, range.last),
  );
  const obligationScope = and(
    eq(obligation.firmId, actor.firmId),
    companies,
    isNotNull(obligation.dueDateConfirmedAt),
    gte(obligation.dueDate, range.first),
    lte(obligation.dueDate, range.last),
  );
  const tasksByDay = await db
    .select({ day: task.dueDate, total: count() })
    .from(task)
    .innerJoin(company, taskCompany)
    .where(taskScope)
    .groupBy(task.dueDate)
    .orderBy(asc(task.dueDate));
  const obligationsByDay = await db
    .select({ day: obligation.dueDate, total: count() })
    .from(obligation)
    .innerJoin(company, obligationCompany)
    .where(obligationScope)
    .groupBy(obligation.dueDate)
    .orderBy(asc(obligation.dueDate));
  const tasks = and(taskScope, eq(task.dueDate, query.day));
  const obligations = and(obligationScope, eq(obligation.dueDate, query.day));
  return {
    month: query.month,
    day: query.day,
    tasksByDay,
    obligationsByDay,
    tasks: await taskRows(db, tasks, 20, (query.taskPage - 1) * 20),
    taskTotal: await rowCount(db, "tasks", tasks),
    obligations: await obligationRows(
      db,
      obligations,
      20,
      (query.obligationPage - 1) * 20,
    ),
    obligationTotal: await rowCount(db, "obligations", obligations),
  };
}
