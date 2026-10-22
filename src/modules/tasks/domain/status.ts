export const taskStatuses = [
  "not_started",
  "in_progress",
  "waiting_for_documents",
  "submitted_for_review",
  "changes_requested",
  "approved",
  "completed",
] as const;
export type TaskStatus = (typeof taskStatuses)[number];
