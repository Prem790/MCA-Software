import {
  check,
  date,
  foreignKey,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { membership } from "@/modules/firms/schema";
import { company } from "@/modules/companies/schema";
import { obligation } from "@/modules/compliance/schema";
import { taskStatuses } from "./domain/status";

export const taskStatus = pgEnum("task_status", taskStatuses);
export const task = pgTable(
  "task",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    firmId: uuid("firm_id").notNull(),
    companyId: uuid("company_id").notNull(),
    obligationId: uuid("obligation_id"),
    title: text("title").notNull(),
    status: taskStatus("status").default("not_started").notNull(),
    assigneeId: text("assignee_id"),
    dueDate: date("due_date").notNull(),
    completionEvidence: text("completion_evidence"),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    unique("task_firm_company_id_unique").on(
      table.firmId,
      table.companyId,
      table.id,
    ),
    foreignKey({
      columns: [table.firmId, table.companyId],
      foreignColumns: [company.firmId, company.id],
    }),
    foreignKey({
      columns: [table.firmId, table.companyId, table.obligationId],
      foreignColumns: [obligation.firmId, obligation.companyId, obligation.id],
    }),
    foreignKey({
      columns: [table.firmId, table.assigneeId],
      foreignColumns: [membership.firmId, membership.userId],
    }),
    check(
      "completed_task_requires_evidence",
      sql`${table.status} <> 'completed' OR (${table.completedAt} IS NOT NULL AND length(trim(${table.completionEvidence})) > 0 AND ${table.completionEvidence} IS NOT NULL)`,
    ),
    index("task_firm_status_due_idx").on(
      table.firmId,
      table.status,
      table.dueDate,
    ),
    index("task_assignee_idx").on(table.firmId, table.assigneeId),
  ],
);
