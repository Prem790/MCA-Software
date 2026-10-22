import type { TaskStatus } from "@/modules/tasks";
import { taskStatuses } from "@/modules/tasks";
import {
  companies,
  previewDate,
  previewMonth,
  tasks,
  type PreviewTask,
} from "./data";

export type SearchParams = Record<string, string | string[] | undefined>;
export function queryText(value: string | string[] | undefined) {
  return typeof value === "string" ? value.slice(0, 200).trim() : "";
}
export const statusLabels: Record<TaskStatus, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  waiting_for_documents: "Waiting for documents",
  submitted_for_review: "In review",
  changes_requested: "Changes requested",
  approved: "Approved",
  completed: "Completed",
};

export function formatDate(
  value: string,
  options: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" },
) {
  return new Intl.DateTimeFormat("en-GB", {
    ...options,
    timeZone: "UTC",
  }).format(new Date(`${value}T12:00:00Z`));
}
export function isOverdue(task: PreviewTask) {
  return task.dueDate < previewDate && task.status !== "completed";
}

export function filterTasks(params: SearchParams, source = tasks) {
  const search = queryText(params.q).toLowerCase();
  const status = queryText(params.status);
  const assignee = queryText(params.assignee);
  const dueDate = queryText(params.date);
  return source.filter(
    (task) =>
      (!search ||
        `${task.title} ${task.company.name}`.toLowerCase().includes(search)) &&
      (!status ||
        status === "all" ||
        (status === "overdue"
          ? isOverdue(task)
          : taskStatuses.some((value) => value === status) &&
            task.status === status)) &&
      (!assignee || assignee === "all" || task.assignee.id === assignee) &&
      (!dueDate || task.dueDate === dueDate),
  );
}

export function filterCompanies(params: SearchParams) {
  const search = queryText(params.q).toLowerCase();
  const type = queryText(params.type);
  return companies.filter(
    (company) =>
      (!search ||
        `${company.name} ${company.city} ${company.industry}`
          .toLowerCase()
          .includes(search)) &&
      (!type || type === "all" || company.type === type),
  );
}

export function companyProgress(companyId: string) {
  const related = tasks.filter((task) => task.companyId === companyId);
  const complete = related.filter((task) => task.status === "completed").length;
  return {
    total: related.length,
    complete,
    percent: related.length ? Math.round((complete / related.length) * 100) : 0,
  };
}

export function calendarMonth(value: string | string[] | undefined) {
  const input = queryText(value);
  const month = /^20\d{2}-(0[1-9]|1[0-2])$/.test(input) ? input : previewMonth;
  const start = new Date(`${month}-01T12:00:00Z`);
  const firstOffset = (start.getUTCDay() + 6) % 7;
  const cells = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setUTCDate(index - firstOffset + 1);
    const key = date.toISOString().slice(0, 10);
    return {
      date: key,
      day: date.getUTCDate(),
      inMonth: key.startsWith(month),
      tasks: tasks.filter((task) => task.dueDate === key),
    };
  });
  const shift = (amount: number) => {
    const date = new Date(start);
    date.setUTCMonth(date.getUTCMonth() + amount);
    return date.toISOString().slice(0, 7);
  };
  return {
    month,
    label: formatDate(`${month}-01`, { month: "long", year: "numeric" }),
    cells,
    previous: shift(-1),
    next: shift(1),
  };
}
