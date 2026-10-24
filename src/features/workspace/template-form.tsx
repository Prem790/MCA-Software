"use client";
import type { FormEvent } from "react";
import { Button } from "@/components/ui/button";
import type { TemplateRecord } from "@/modules/compliance/contracts";
import { useWorkMutation } from "./use-work-mutation";
import { WorkFeedback } from "./work-feedback";
export function TemplateForm({
  firmId,
  template,
}: {
  firmId: string;
  template?: Pick<TemplateRecord, "id" | "name" | "description" | "version">;
}) {
  const mutation = useWorkMutation();
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const element = event.currentTarget;
    const form = new FormData(element);
    const result = await mutation.run(
      `/api/firms/${firmId}/templates${template ? `/${template.id}` : ""}`,
      template ? "PATCH" : "POST",
      {
        name: String(form.get("name")),
        description: String(form.get("description")),
        ...(template ? { version: template.version } : {}),
      },
    );
    if (result && !template) element.reset();
  }
  async function archive() {
    if (
      !template ||
      !window.confirm(
        "Archive this template? Existing obligations will retain their own titles and instructions.",
      )
    )
      return;
    await mutation.run(
      `/api/firms/${firmId}/templates/${template.id}`,
      "DELETE",
    );
  }
  return (
    <form onSubmit={submit} className="workspace-form">
      <label className="field-label">
        Template name
        <input
          name="name"
          defaultValue={template?.name}
          required
          minLength={2}
          maxLength={200}
        />
      </label>
      <label className="field-label">
        Default instructions
        <textarea
          name="description"
          defaultValue={template?.description}
          maxLength={4000}
          rows={3}
        />
      </label>
      <p className="workspace-note">
        Templates are your firm's reusable instructions. They do not determine
        applicability or statutory deadlines.
      </p>
      <WorkFeedback error={mutation.error} />
      <div className="workspace-actions">
        <Button type="submit" disabled={mutation.pending}>
          {mutation.pending
            ? "Saving…"
            : template
              ? "Save template"
              : "Create template"}
        </Button>
        {template && (
          <Button
            type="button"
            variant="outline"
            disabled={mutation.pending}
            onClick={archive}
          >
            Archive
          </Button>
        )}
      </div>
    </form>
  );
}
