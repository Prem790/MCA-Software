import {
  date,
  foreignKey,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { firm } from "@/modules/firms/schema";
import { company } from "@/modules/companies/schema";

export const obligationTemplate = pgTable(
  "obligation_template",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    firmId: uuid("firm_id")
      .notNull()
      .references(() => firm.id),
    name: text("name").notNull(),
    description: text("description").notNull(),
    version: integer("version").default(1).notNull(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
  },
  (table) => [unique("template_firm_id_unique").on(table.firmId, table.id)],
);

export const obligation = pgTable(
  "obligation",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    firmId: uuid("firm_id").notNull(),
    companyId: uuid("company_id").notNull(),
    templateId: uuid("template_id"),
    title: text("title").notNull(),
    description: text("description").default("").notNull(),
    reportingPeriod: text("reporting_period").notNull(),
    dueDate: date("due_date").notNull(),
    dueDateConfirmedAt: timestamp("due_date_confirmed_at", {
      withTimezone: true,
    }),
    recurrence: text("recurrence", {
      enum: ["none", "monthly", "quarterly", "annual"],
    })
      .default("none")
      .notNull(),
    seriesId: uuid("series_id"),
    anchorDueDate: date("anchor_due_date"),
    occurrenceNumber: integer("occurrence_number").default(0).notNull(),
    version: integer("version").default(1).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    unique("obligation_series_occurrence_unique").on(
      table.firmId,
      table.companyId,
      table.seriesId,
      table.occurrenceNumber,
    ),
    unique("obligation_firm_company_id_unique").on(
      table.firmId,
      table.companyId,
      table.id,
    ),
    foreignKey({
      columns: [table.firmId, table.companyId],
      foreignColumns: [company.firmId, company.id],
    }),
    foreignKey({
      columns: [table.firmId, table.templateId],
      foreignColumns: [obligationTemplate.firmId, obligationTemplate.id],
    }),
    index("obligation_firm_due_idx").on(table.firmId, table.dueDate),
  ],
);
