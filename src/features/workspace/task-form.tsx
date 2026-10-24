"use client";
import type { FormEvent } from "react";

import Link from "next/link";
import { displayLabel } from "./data-display";
import { Button } from "@/components/ui/button";
import {
  taskPriorities,
  type TaskRecord,
  type WorkOptions,
} from "@/modules/tasks/contracts";
import { useWorkMutation } from "./use-work-mutation";
import { WorkFeedback } from "./work-feedback";

type TaskFields = Pick<
  TaskRecord,
  | "id"
  | "title"
  | "description"
  | "priority"
  | "assigneeId"
  | "dueDate"
  | "version"
>;
export function TaskForm({
  firmId,
  options,
  task,
  companyId = "",
  obligationId,
  defaults,
}: {
  firmId: string;
  options: WorkOptions;
  task?: TaskFields;
  companyId?: string;
  obligationId?: string;
  defaults?: { title: string; description: string; dueDate: string };
}) {
  const mutation = useWorkMutation();
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const input = {
      title: String(form.get("title")),
      description: String(form.get("description")),
      dueDate: String(form.get("dueDate")),
      priority: String(form.get("priority")),
      assigneeId: String(form.get("assigneeId")) || null,
    };
    await mutation.run<{ id: string }>(
      `/api/firms/${firmId}/tasks${task ? `/${task.id}` : ""}`,
      task ? "PATCH" : "POST",
      task
        ? { ...input, version: task.version }
        : {
            ...input,
            companyId: companyId || String(form.get("companyId")),
            obligationId: obligationId || null,
          },
      {
        navigateTo: (saved) => `/workspace/${firmId}/tasks/${saved.id}`,
        successMessage: "Task saved.",
      },
    );
  }
  return (
    <form
      onSubmit={submit}
      className="workspace-form workflow-form"
      aria-label={task ? "Edit task" : "Create task"}
      aria-busy={mutation.pending}
    >
      <fieldset className="workflow-fields" disabled={mutation.pending}>
        <legend>Task details</legend>
        <p className="form-guidance">Fields marked * are required.</p>
        {options.limited && (
          <p className="workspace-note">
            Pickers show up to 200 companies and members. For another company,
            open its record and choose New task.
          </p>
        )}
        {!task && !companyId && (
          <label className="field-label">
            <span className="field-caption">
              Company{" "}
              <span className="required-mark" aria-hidden="true">
                *
              </span>
            </span>
            <select name="companyId" required defaultValue="">
              <option value="" disabled>
                Choose company
              </option>
              {options.companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="field-label">
          <span className="field-caption">
            Task title{" "}
            <span className="required-mark" aria-hidden="true">
              *
            </span>
          </span>
          <input
            name="title"
            defaultValue={task?.title ?? defaults?.title}
            required
            minLength={2}
            maxLength={200}
          />
        </label>
        <label className="field-label">
          Instructions (optional)
          <textarea
            name="description"
            defaultValue={task?.description ?? defaults?.description}
            maxLength={4000}
            rows={4}
          />
        </label>
        <label className="field-label">
          Assign to
          <select name="assigneeId" defaultValue={task?.assigneeId ?? ""}>
            <option value="">Unassigned</option>
            {options.members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
            {task?.assigneeId &&
              !options.members.some(
                (member) => member.id === task.assigneeId,
              ) && (
                <option value={task.assigneeId}>
                  Current member unavailable — choose another
                </option>
              )}
          </select>
        </label>
        <label className="field-label">
          Priority
          <select name="priority" defaultValue={task?.priority ?? "normal"}>
            {taskPriorities.map((priority) => (
              <option key={priority} value={priority}>
                {displayLabel(priority)}
              </option>
            ))}
          </select>
        </label>
        <label className="field-label">
          <span className="field-caption">
            Task due date{" "}
            <span className="required-mark" aria-hidden="true">
              *
            </span>
          </span>
          <input
            name="dueDate"
            type="date"
            defaultValue={task?.dueDate ?? defaults?.dueDate}
            min="2000-01-01"
            max="2199-12-31"
            required
          />
        </label>
        <p className="workspace-note">
          This is the internal task deadline. It does not change a linked
          obligation's confirmed due date.
        </p>
      </fieldset>
      <WorkFeedback error={mutation.error} notice={mutation.notice} />
      <div className="form-actions">
        <Button type="submit" disabled={mutation.pending}>
          {mutation.pending ? "Saving…" : task ? "Save task" : "Create task"}
        </Button>
        {!task && !mutation.pending && (
          <Link className="form-cancel" href={`/workspace/${firmId}/tasks`}>
            Cancel
          </Link>
        )}
      </div>
    </form>
  );
}
