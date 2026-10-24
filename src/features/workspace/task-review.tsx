"use client";
import type { FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { useWorkMutation } from "./use-work-mutation";
import { WorkFeedback } from "./work-feedback";
export function TaskReview({
  firmId,
  taskId,
  version,
  reviewers,
  pendingId,
  submit,
  decide,
}: {
  firmId: string;
  taskId: string;
  version: number;
  reviewers: { id: string; name: string }[];
  pendingId?: string;
  submit: boolean;
  decide: boolean;
}) {
  const mutation = useWorkMutation();
  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await mutation.run(
      `/api/firms/${firmId}/tasks/${taskId}/reviews/${submit ? "submit" : "decision"}`,
      "POST",
      submit
        ? {
            version,
            reviewerId: String(form.get("reviewerId")),
            evidence: String(form.get("evidence")),
          }
        : {
            version,
            reviewId: pendingId,
            outcome: String(form.get("outcome")),
            feedback: String(form.get("feedback")),
          },
    );
  }
  if (!submit && !decide) return null;
  return (
    <form
      className="workspace-form workflow-form review-form"
      aria-label={submit ? "Submit task for review" : "Record review decision"}
      aria-busy={mutation.pending}
      onSubmit={send}
    >
      <fieldset className="workflow-fields" disabled={mutation.pending}>
        <legend>
          {submit ? "Submit for independent review" : "Review decision"}
        </legend>
        {submit ? (
          <>
            <label className="field-label">
              Independent reviewer
              <select name="reviewerId" required defaultValue="">
                <option value="" disabled>
                  Choose an admin or manager
                </option>
                {reviewers.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.name}
                  </option>
                ))}
              </select>
            </label>
            {!reviewers.length && (
              <p>
                Another active admin or manager is needed. An operator can
                provision their account while email invitations are deferred.
              </p>
            )}
            <label className="field-label">
              Submission evidence / work summary
              <textarea
                name="evidence"
                minLength={3}
                maxLength={4000}
                rows={4}
                required
              />
            </label>
            <p className="workspace-note">
              The task, checklist and current task attachments will be frozen
              for review. Company-only documents are not part of this
              submission.
            </p>
          </>
        ) : (
          <>
            <p className="workspace-note workflow-callout">
              Review the frozen submission and its evidence before deciding.
              Approval is internal; the task still needs a completion note
              before it can be completed.
            </p>
            <label className="field-label">
              Decision
              <select name="outcome">
                <option value="changes_requested">Request corrections</option>
                <option value="approved">Approve</option>
              </select>
            </label>
            <label className="field-label">
              Review feedback
              <textarea
                name="feedback"
                minLength={3}
                maxLength={2000}
                required
                rows={4}
              />
            </label>
          </>
        )}
      </fieldset>
      <WorkFeedback error={mutation.error} notice={mutation.notice} />
      <Button
        type="submit"
        disabled={mutation.pending || (submit && !reviewers.length)}
      >
        {mutation.pending
          ? "Saving…"
          : submit
            ? "Submit for review"
            : "Record decision"}
      </Button>
    </form>
  );
}
