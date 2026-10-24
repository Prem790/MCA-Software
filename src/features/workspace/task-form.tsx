"use client";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
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
  const router = useRouter();
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
    const result = await mutation.run<{ id: string }>(
      `/api/firms/${firmId}/tasks${task ? `/${task.id}` : ""}`,
      task ? "PATCH" : "POST",
      task
        ? { ...input, version: task.version }
        : {
            ...input,
            companyId: companyId || String(form.get("companyId")),
            obligationId: obligationId || null,
          },
    );
    if (result) router.push(`/workspace/${firmId}/tasks/${result.id}`);
  }
  return (
    <form onSubmit={submit} className="workspace-form">
      {options.limited && (
        <p className="workspace-note">
          Pickers show up to 200 companies and members. For another company,
          open its record and choose New task.
        </p>
      )}
      {!task && !companyId && (
        <label className="field-label">
          Company
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
        Task title
        <input
          name="title"
          defaultValue={task?.title ?? defaults?.title}
          required
          minLength={2}
          maxLength={200}
        />
      </label>
      <label className="field-label">
        Instructions
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
              {priority}
            </option>
          ))}
        </select>
      </label>
      <label className="field-label">
        Task due date
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
      <WorkFeedback error={mutation.error} />
      <Button type="submit" disabled={mutation.pending}>
        {mutation.pending ? "Saving…" : task ? "Save task" : "Create task"}
      </Button>
    </form>
  );
}
