import type { TaskStatus } from "./status";
export const workStatuses = [
  "not_started",
  "in_progress",
  "waiting_for_documents",
  "completed",
] as const;
export type WorkStatus = (typeof workStatuses)[number];
export function isEditableWork(status: TaskStatus) {
  return (
    status === "not_started" ||
    status === "in_progress" ||
    status === "waiting_for_documents" ||
    status === "changes_requested"
  );
}
export function completionIssue(uncheckedItems: number, evidence: string) {
  if (uncheckedItems > 0) return "checklist";
  if (evidence.trim().length < 3) return "evidence";
  return null;
}
export function mayWorkOnTask(
  role: "admin" | "manager" | "staff",
  userId: string,
  assigneeId: string | null,
) {
  return role !== "staff" || assigneeId === userId;
}
export function mayTransition(
  role: "admin" | "manager" | "staff",
  current: TaskStatus,
  next: WorkStatus,
) {
  if (current === next) return true;
  if (next === "completed") return current === "approved";
  if (current === "completed")
    return role !== "staff" && next === "in_progress";
  if (current === "changes_requested") return true;
  if (!workStatuses.some((value) => value === current))
    return role !== "staff" && next === "in_progress";
  return true;
}
