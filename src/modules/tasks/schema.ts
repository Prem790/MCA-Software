import {
  check,
  date,
  foreignKey,
  index,
  integer,
  jsonb,
  boolean,
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
import { user } from "@/modules/identity/schema";
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
    description: text("description").default("").notNull(),
    priority: text("priority", { enum: ["low", "normal", "high", "urgent"] })
      .default("normal")
      .notNull(),
    version: integer("version").default(1).notNull(),
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

export const taskChecklist = pgTable(
  "task_checklist",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    firmId: uuid("firm_id").notNull(),
    companyId: uuid("company_id").notNull(),
    taskId: uuid("task_id").notNull(),
    title: text("title").notNull(),
    checked: boolean("checked").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.firmId, table.companyId, table.taskId],
      foreignColumns: [task.firmId, task.companyId, task.id],
    }),
    index("checklist_task_idx").on(table.firmId, table.taskId),
  ],
);

export const taskComment = pgTable(
  "task_comment",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    firmId: uuid("firm_id").notNull(),
    companyId: uuid("company_id").notNull(),
    taskId: uuid("task_id").notNull(),
    authorId: text("author_id")
      .notNull()
      .references(() => user.id),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.firmId, table.companyId, table.taskId],
      foreignColumns: [task.firmId, task.companyId, task.id],
    }),
    index("comment_task_time_idx").on(
      table.firmId,
      table.taskId,
      table.createdAt,
    ),
  ],
);

export const taskReview = pgTable(
  "task_review",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    firmId: uuid("firm_id").notNull(),
    companyId: uuid("company_id").notNull(),
    taskId: uuid("task_id").notNull(),
    submittedBy: text("submitted_by")
      .notNull()
      .references(() => user.id),
    reviewerId: text("reviewer_id")
      .notNull()
      .references(() => user.id),
    submittedVersion: integer("submitted_version").notNull(),
    evidence: text("evidence").notNull(),
    snapshot: jsonb("snapshot")
      .$type<{
        title: string;
        description: string;
        dueDate: string;
        assigneeId: string | null;
        priority: string;
        obligationId: string | null;
        checklist: { id: string; title: string; checked: boolean }[];
        documents: { id: string; name: string; sha256: string | null }[];
      }>()
      .notNull(),
    outcome: text("outcome", {
      enum: ["pending", "approved", "changes_requested", "withdrawn"],
    })
      .default("pending")
      .notNull(),
    feedback: text("feedback"),
    decidedBy: text("decided_by").references(() => user.id),
    submittedAt: timestamp("submitted_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
  },
  (table) => [
    foreignKey({
      columns: [table.firmId, table.companyId, table.taskId],
      foreignColumns: [task.firmId, task.companyId, task.id],
    }),
    unique("review_task_version_unique").on(
      table.firmId,
      table.taskId,
      table.submittedVersion,
    ),
    check(
      "review_independent_reviewer",
      sql`${table.submittedBy} <> ${table.reviewerId}`,
    ),
    check(
      "review_decision_consistent",
      sql`(${table.outcome} = 'pending' AND ${table.decidedAt} IS NULL AND ${table.decidedBy} IS NULL) OR (${table.outcome} <> 'pending' AND ${table.decidedAt} IS NOT NULL AND ${table.decidedBy} IS NOT NULL)`,
    ),
    foreignKey({
      columns: [table.firmId, table.submittedBy],
      foreignColumns: [membership.firmId, membership.userId],
    }),
    foreignKey({
      columns: [table.firmId, table.reviewerId],
      foreignColumns: [membership.firmId, membership.userId],
    }),
    foreignKey({
      columns: [table.firmId, table.decidedBy],
      foreignColumns: [membership.firmId, membership.userId],
    }),
    check(
      "review_outcome_valid",
      sql`${table.outcome} IN ('pending', 'approved', 'changes_requested', 'withdrawn')`,
    ),
    check(
      "review_feedback_required",
      sql`${table.outcome} = 'pending' OR length(trim(${table.feedback})) >= 3 AND ${table.feedback} IS NOT NULL`,
    ),
    check(
      "review_decision_by_reviewer",
      sql`${table.outcome} NOT IN ('approved', 'changes_requested') OR ${table.decidedBy} = ${table.reviewerId}`,
    ),
    index("review_task_idx").on(
      table.firmId,
      table.taskId,
      table.submittedVersion,
    ),
  ],
);
