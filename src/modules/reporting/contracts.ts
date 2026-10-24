import "server-only";
import { z } from "zod";
import { taskQuery } from "@/modules/tasks/server";
import { isDateOnly } from "@/lib/work-dates";
export const REPORT_LIMIT = 1000;
export const MAX_CSV_BYTES = 3 * 1024 * 1024;
export const reportKind = z.enum(["tasks", "obligations"]);
export type ReportKind = z.infer<typeof reportKind>;
const optionalDate = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().refine(isDateOnly).optional(),
);
const companyId = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.uuid().optional(),
);
export const reportQuery = taskQuery
  .extend({
    dateFrom: optionalDate,
    dateTo: optionalDate,
    reviewer: z.enum(["all", "me"]).default("all"),
  })
  .refine(
    (input) =>
      !input.dateFrom || !input.dateTo || input.dateFrom <= input.dateTo,
    { message: "The start date must not follow the end date" },
  );
export type ReportQuery = z.infer<typeof reportQuery>;
export const dashboardQuery = z.object({
  companyId,
  page: z.coerce.number().int().min(1).max(10000).default(1),
});
export type DashboardQuery = z.infer<typeof dashboardQuery>;
export const calendarQuery = z
  .object({
    companyId,
    archived: z.enum(["active", "all"]).default("active"),
    month: z
      .string()
      .regex(/^(20|21)\d{2}-(0[1-9]|1[0-2])$/)
      .optional(),
    day: optionalDate,
    taskPage: z.coerce.number().int().min(1).max(10000).default(1),
    obligationPage: z.coerce.number().int().min(1).max(10000).default(1),
  })
  .refine(
    (input) =>
      !input.day || !input.month || input.day.startsWith(input.month + "-"),
    { message: "Choose a day in the selected month" },
  );
export type CalendarQuery = z.infer<typeof calendarQuery> & {
  month: string;
  day: string;
};
export type ReportRow = {
  id: string;
  title: string;
  companyName: string;
  companyArchivedAt: Date | null;
  dueDate: string;
  status: string | null;
  priority: string | null;
  assigneeId: string | null;
  assigneeName: string | null;
  assigneeRevokedAt: Date | null;
  reportingPeriod: string | null;
  confirmed: boolean | null;
};
export type WorkloadRow = {
  assigneeId: string | null;
  name: string | null;
  revokedAt: Date | null;
  open: number;
  overdue: number;
  pendingReview: number;
  completed: number;
};
export type DashboardData = {
  today: string;
  counts: {
    total: number;
    open: number;
    completed: number;
    overdue: number;
    upcoming: number;
    pendingReview: number;
    changesRequested: number;
    approved: number;
    waitingDocuments: number;
    mine: number;
    myReviews: number;
  };
  obligations: { total: number; upcoming: number; unconfirmed: number };
  upcoming: ReportRow[];
  reviewQueue: ReportRow[];
  workload: WorkloadRow[];
  workloadTotal: number;
};
export type CalendarData = {
  month: string;
  day: string;
  tasksByDay: { day: string; total: number }[];
  obligationsByDay: { day: string; total: number }[];
  tasks: ReportRow[];
  taskTotal: number;
  obligations: ReportRow[];
  obligationTotal: number;
};
