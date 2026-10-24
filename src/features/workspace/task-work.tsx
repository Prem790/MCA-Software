"use client";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import type { ChecklistRecord, TaskRecord } from "@/modules/tasks/contracts";
import { workStatuses, isEditableWork } from "@/modules/tasks";
import { useWorkMutation } from "./use-work-mutation";
import { DataBadge } from "./data-views";
import { displayLabel } from "./data-display";
import { WorkFeedback } from "./work-feedback";

export function TaskWork({
  firmId,
  task,
  checklist,
  canManage,
  canWork,
  archived,
}: {
  firmId: string;
  task: Pick<TaskRecord, "id" | "version" | "status" | "completionEvidence">;
  checklist: ChecklistRecord[];
  canManage: boolean;
  canWork: boolean;
  archived: boolean;
}) {
  const mutation = useWorkMutation();
  const [removingId, setRemovingId] = useState<string | null>(null);
  const path = `/api/firms/${firmId}/tasks/${task.id}`;
  const open = isEditableWork(task.status);
  async function status(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await mutation.run(`${path}/status`, "PATCH", {
      version: task.version,
      status: String(form.get("status")),
      evidence: String(form.get("evidence") ?? ""),
    });
  }
  async function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const element = event.currentTarget;
    const form = new FormData(element);
    const result = await mutation.run(`${path}/checklist`, "POST", {
      version: task.version,
      title: String(form.get("title")),
    });
    if (result !== null) element.reset();
  }
  async function remove(item: ChecklistRecord) {
    const result = await mutation.run(
      `${path}/checklist/${item.id}`,
      "DELETE",
      {
        version: task.version,
      },
    );
    if (result !== null) setRemovingId(null);
  }
  return (
    <>
      <section className="panel workspace-panel" id="task-progress">
        <h2>Progress</h2>
        <p>
          Current status: <DataBadge value={task.status} />
        </p>
        {task.completionEvidence && (
          <p className="work-preserve">
            Completion note: {task.completionEvidence}
          </p>
        )}
        <p className="workspace-note">
          Complete the checklist, attach supporting files and submit for
          independent review below. Approval is internal; it does not confirm a
          statutory filing.
        </p>
        {!archived &&
          canWork &&
          (open || canManage || task.status === "approved") && (
            <form
              onSubmit={status}
              className="workspace-form workflow-form"
              aria-label="Update task progress"
              aria-busy={mutation.pending}
            >
              <fieldset className="workflow-fields" disabled={mutation.pending}>
                <legend>Update progress</legend>
                <label className="field-label">
                  Change status
                  <select
                    name="status"
                    defaultValue={
                      open
                        ? task.status === "changes_requested"
                          ? "in_progress"
                          : task.status
                        : task.status === "approved"
                          ? "completed"
                          : "in_progress"
                    }
                  >
                    {(open
                      ? workStatuses.filter((value) => value !== "completed")
                      : task.status === "approved"
                        ? canManage
                          ? ["completed", "in_progress"]
                          : ["completed"]
                        : ["in_progress"]
                    ).map((value) => (
                      <option value={value} key={value}>
                        {displayLabel(value)}
                      </option>
                    ))}
                  </select>
                </label>
                {task.status === "approved" && (
                  <label className="field-label">
                    Completion note / evidence
                    <textarea
                      name="evidence"
                      maxLength={4000}
                      rows={3}
                      placeholder="Required when marking completed. Describe what was done and where its evidence is held."
                    />
                  </label>
                )}
                <p className="workspace-note workflow-callout">
                  Completing needs current independent approval and a completion
                  note. Reopening invalidates the previous approval and requires
                  a new review.
                </p>
              </fieldset>
              <Button type="submit" disabled={mutation.pending}>
                {mutation.pending
                  ? "Saving…"
                  : open
                    ? "Update progress"
                    : task.status === "approved"
                      ? "Save status"
                      : "Reopen task"}
              </Button>
            </form>
          )}
        {!canWork && (
          <p className="workspace-note">
            Staff can update only tasks assigned to them.
          </p>
        )}
      </section>
      <section className="panel workspace-panel">
        <h2>
          Checklist · {checklist.filter((item) => item.checked).length}/
          {checklist.length}
        </h2>
        <ul className="work-checklist">
          {checklist.map((item) => (
            <li key={item.id}>
              <label className="work-check">
                <input
                  type="checkbox"
                  checked={item.checked}
                  disabled={archived || !canWork || !open || mutation.pending}
                  onChange={(event) =>
                    void mutation.run(`${path}/checklist/${item.id}`, "PATCH", {
                      version: task.version,
                      checked: event.target.checked,
                    })
                  }
                />
                {item.title}
              </label>
              {!archived && canManage && open && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={mutation.pending}
                  aria-label={`Remove checklist item ${item.title}`}
                  onClick={() => setRemovingId(item.id)}
                >
                  Remove
                </Button>
              )}
              {removingId === item.id && !archived && canManage && open && (
                <div className="workflow-confirmation">
                  <p>Remove “{item.title}” from this checklist?</p>
                  <Button
                    type="button"
                    size="sm"
                    disabled={mutation.pending}
                    onClick={() => remove(item)}
                  >
                    Confirm remove
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={mutation.pending}
                    onClick={() => setRemovingId(null)}
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
        {!checklist.length && <p>No checklist items yet.</p>}
        {!archived && canManage && open && (
          <form
            onSubmit={add}
            className="workspace-form workflow-form"
            aria-busy={mutation.pending}
          >
            <label className="field-label">
              New checklist item
              <input
                name="title"
                maxLength={200}
                required
                disabled={mutation.pending}
              />
            </label>
            <Button
              type="submit"
              disabled={mutation.pending || checklist.length >= 50}
            >
              Add item
            </Button>
            <p className="workspace-note">
              Up to 50 items. All must be checked before completing the task.
            </p>
          </form>
        )}
      </section>
      <WorkFeedback error={mutation.error} notice={mutation.notice} />
    </>
  );
}

export function TaskCommentForm({
  firmId,
  taskId,
}: {
  firmId: string;
  taskId: string;
}) {
  const mutation = useWorkMutation();
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const element = event.currentTarget;
    const body = String(new FormData(element).get("body"));
    const result = await mutation.run(
      `/api/firms/${firmId}/tasks/${taskId}/comments`,
      "POST",
      { body },
      {
        successMessage: "Comment posted.",
        navigateTo: () => `/workspace/${firmId}/tasks/${taskId}`,
      },
    );
    if (result !== null) element.reset();
  }
  return (
    <form
      onSubmit={submit}
      className="workspace-form workflow-form"
      aria-label="Post task comment"
      aria-busy={mutation.pending}
    >
      <label className="field-label">
        Add a comment
        <textarea
          name="body"
          required
          maxLength={2000}
          rows={3}
          disabled={mutation.pending}
          placeholder="Share a progress update or context for your team."
        />
      </label>
      <WorkFeedback error={mutation.error} notice={mutation.notice} />
      <Button type="submit" disabled={mutation.pending}>
        {mutation.pending ? "Saving…" : "Post comment"}
      </Button>
    </form>
  );
}
