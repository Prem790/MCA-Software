import { z } from "zod";
import { isDateOnly } from "@/lib/work-dates";
import type { Actor } from "@/modules/firms";
import { taskStatuses, type TaskStatus } from "./domain/status";
import { workStatuses } from "./domain/work-policy";

export const taskPriorities = ["low", "normal", "high", "urgent"] as const;
const dateInput = z
  .string()
  .refine(isDateOnly, "Enter a real date between 2000 and 2199");
export const taskFields = z
  .object({
    title: z.string().trim().min(2).max(200),
    description: z.string().trim().max(4000),
    assigneeId: z.string().min(1).max(128).nullable(),
    priority: z.enum(taskPriorities),
    dueDate: dateInput,
  })
  .strict();
export const taskInput = taskFields.extend({
  companyId: z.uuid(),
  obligationId: z.uuid().nullable().default(null),
});
export const taskUpdate = taskFields.extend({
  version: z.number().int().positive(),
});
export const statusInput = z
  .object({
    version: z.number().int().positive(),
    status: z.enum(workStatuses),
    evidence: z.string().trim().max(4000).default(""),
  })
  .strict();
export const reviewSubmission = z
  .object({
    version: z.number().int().positive(),
    reviewerId: z.string().min(1).max(128),
    evidence: z.string().trim().min(3).max(4000),
  })
  .strict();
export const reviewDecision = z
  .object({
    version: z.number().int().positive(),
    reviewId: z.uuid(),
    outcome: z.enum(["approved", "changes_requested"]),
    feedback: z.string().trim().min(3).max(2000),
  })
  .strict();
export const checklistInput = z
  .object({
    version: z.number().int().positive(),
    title: z.string().trim().min(1).max(200),
  })
  .strict();
export const checklistToggle = z
  .object({ version: z.number().int().positive(), checked: z.boolean() })
  .strict();
export const versionInput = z
  .object({ version: z.number().int().positive() })
  .strict();
export const commentInput = z
  .object({ body: z.string().trim().min(1).max(2000) })
  .strict();
export const taskQuery = z.object({
  q: z.string().trim().max(200).default(""),
  companyId: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.uuid().optional(),
  ),
  obligationId: z.uuid().optional(),
  assigneeId: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.string().min(1).max(128).optional(),
  ),
  status: z.enum(["all", ...taskStatuses]).default("all"),
  priority: z.enum(["all", ...taskPriorities]).default("all"),
  due: z.enum(["all", "overdue", "upcoming"]).default("all"),
  archived: z.enum(["active", "all"]).default("active"),
  page: z.coerce.number().int().min(1).max(10000).default(1),
});
export const commentQuery = z.object({
  commentPage: z.coerce.number().int().min(1).max(10000).default(1),
});
export type TaskInput = z.infer<typeof taskInput>;
export type TaskUpdate = z.infer<typeof taskUpdate>;
export type TaskQuery = z.infer<typeof taskQuery>;
export type TaskContext = Actor & { requestId: string };
export type TaskRecord = {
  id: string;
  firmId: string;
  companyId: string;
  obligationId: string | null;
  title: string;
  description: string;
  priority: (typeof taskPriorities)[number];
  version: number;
  status: TaskStatus;
  assigneeId: string | null;
  dueDate: string;
  completionEvidence: string | null;
  completedAt: Date | null;
  createdAt: Date;
};
export type TaskListItem = TaskRecord & {
  companyName: string;
  companyArchivedAt: Date | null;
  assigneeName: string | null;
  assigneeRevokedAt: Date | null;
  obligationTitle: string | null;
};
export type ChecklistRecord = { id: string; title: string; checked: boolean };
export type CommentRecord = {
  id: string;
  body: string;
  authorName: string;
  createdAt: Date;
};
export type WorkOptions = {
  companies: { id: string; name: string }[];
  members: { id: string; name: string }[];
  limited: boolean;
};
export interface TaskRepository {
  options(firmId: string): Promise<WorkOptions>;
  list(
    actor: Actor,
    query: TaskQuery,
    today: string,
  ): Promise<{ items: TaskListItem[]; total: number }>;
  detail(
    firmId: string,
    id: string,
    commentPage: number,
  ): Promise<{
    task: TaskListItem;
    checklist: ChecklistRecord[];
    comments: CommentRecord[];
    commentTotal: number;
  }>;
  create(context: TaskContext, input: TaskInput): Promise<TaskRecord>;
  update(
    context: TaskContext,
    id: string,
    input: TaskUpdate,
  ): Promise<TaskRecord>;
  transition(
    context: TaskContext,
    id: string,
    input: z.infer<typeof statusInput>,
  ): Promise<TaskRecord>;
  addChecklist(
    context: TaskContext,
    id: string,
    input: z.infer<typeof checklistInput>,
  ): Promise<void>;
  toggleChecklist(
    context: TaskContext,
    id: string,
    itemId: string,
    input: z.infer<typeof checklistToggle>,
  ): Promise<void>;
  removeChecklist(
    context: TaskContext,
    id: string,
    itemId: string,
    version: number,
  ): Promise<void>;
  comment(context: TaskContext, id: string, body: string): Promise<void>;
}
