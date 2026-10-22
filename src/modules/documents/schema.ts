import {
  bigint,
  check,
  foreignKey,
  index,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { company } from "@/modules/companies/schema";
import { membership } from "@/modules/firms/schema";
import { task } from "@/modules/tasks/schema";

export const document = pgTable(
  "document",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    firmId: uuid("firm_id").notNull(),
    companyId: uuid("company_id").notNull(),
    taskId: uuid("task_id"),
    uploadedBy: text("uploaded_by").notNull(),
    objectKey: text("object_key").notNull().unique(),
    originalName: text("original_name").notNull(),
    mediaType: text("media_type").notNull(),
    sizeBytes: bigint("size_bytes", { mode: "number" }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.firmId, table.companyId],
      foreignColumns: [company.firmId, company.id],
    }),
    foreignKey({
      columns: [table.firmId, table.companyId, table.taskId],
      foreignColumns: [task.firmId, task.companyId, task.id],
    }),
    foreignKey({
      columns: [table.firmId, table.uploadedBy],
      foreignColumns: [membership.firmId, membership.userId],
    }),
    check("document_positive_size", sql`${table.sizeBytes} > 0`),
    index("document_firm_company_idx").on(table.firmId, table.companyId),
  ],
);
