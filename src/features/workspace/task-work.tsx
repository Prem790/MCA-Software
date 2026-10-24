"use client";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import type { ChecklistRecord, TaskRecord } from "@/modules/tasks/contracts";
import { workStatuses, isEditableWork } from "@/modules/tasks";
import { useWorkMutation } from "./use-work-mutation";
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
    if (
      await mutation.run(`${path}/checklist`, "POST", {
        version: task.version,
        title: String(form.get("title")),
      })
    )
      element.reset();
  }
  async function remove(item: ChecklistRecord) {
    if (!window.confirm(`Remove checklist item “${item.title}”?`)) return;
    await mutation.run(`${path}/checklist/${item.id}`, "DELETE", {
      version: task.version,
    });
  }
  return (
    <>
      <section className="panel workspace-panel">
        <h2>Progress</h2>
        <p>
          Current status: <strong>{task.status.replaceAll("_", " ")}</strong>
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
            <form onSubmit={status} className="workspace-form">
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
                      {value.replaceAll("_", " ")}
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
                  onClick={() => remove(item)}
                >
                  Remove
                </Button>
              )}
            </li>
          ))}
        </ul>
        {!checklist.length && <p>No checklist items yet.</p>}
        {!archived && canManage && open && (
          <form onSubmit={add} className="workspace-form">
            <label className="field-label">
              New checklist item
              <input name="title" maxLength={200} required />
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
      <WorkFeedback error={mutation.error} />
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
  const router = useRouter();
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const element = event.currentTarget;
    const body = String(new FormData(element).get("body"));
    if (
      await mutation.run(
        `/api/firms/${firmId}/tasks/${taskId}/comments`,
        "POST",
        { body },
      )
    ) {
      element.reset();
      router.replace(`/workspace/${firmId}/tasks/${taskId}`);
    }
  }
  return (
    <form onSubmit={submit} className="workspace-form">
      <label className="field-label">
        Add a comment
        <textarea name="body" required maxLength={2000} rows={3} />
      </label>
      <WorkFeedback error={mutation.error} />
      <Button type="submit" disabled={mutation.pending}>
        {mutation.pending ? "Saving…" : "Post comment"}
      </Button>
    </form>
  );
}
