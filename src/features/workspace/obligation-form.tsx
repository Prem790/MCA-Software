"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import type {
  ObligationRecord,
  TemplateRecord,
} from "@/modules/compliance/contracts";
import type { WorkOptions } from "@/modules/tasks/contracts";
import { useWorkMutation } from "./use-work-mutation";
import { WorkFeedback } from "./work-feedback";

type EditableObligation = Pick<
  ObligationRecord,
  "id" | "title" | "description" | "dueDate" | "reportingPeriod" | "version"
>;
export function ObligationForm({
  firmId,
  options,
  templates = [],
  companyId = "",
  selectedTemplate,
  obligation,
}: {
  firmId: string;
  options?: WorkOptions;
  templates?: TemplateRecord[];
  companyId?: string;
  selectedTemplate?: TemplateRecord;
  obligation?: EditableObligation;
}) {
  const router = useRouter();
  const mutation = useWorkMutation();
  const [templateId, setTemplateId] = useState(selectedTemplate?.id ?? "");
  const selected =
    templates.find((template) => template.id === templateId) ??
    selectedTemplate;
  const [title, setTitle] = useState(
    obligation?.title ?? selectedTemplate?.name ?? "",
  );
  const [description, setDescription] = useState(
    obligation?.description ?? selectedTemplate?.description ?? "",
  );
  function chooseTemplate(id: string) {
    setTemplateId(id);
    const value = templates.find((template) => template.id === id);
    if (value) {
      setTitle(value.name);
      setDescription(value.description);
    }
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const input = {
      title,
      description,
      reportingPeriod: String(form.get("reportingPeriod")),
      dueDate: String(form.get("dueDate")),
      confirmed: form.get("confirmed") === "on",
    };
    const result = await mutation.run<{ id: string }>(
      `/api/firms/${firmId}/obligations${obligation ? `/${obligation.id}` : ""}`,
      obligation ? "PATCH" : "POST",
      obligation
        ? { ...input, version: obligation.version }
        : {
            ...input,
            companyId: companyId || String(form.get("companyId")),
            templateId: templateId || null,
            recurrence: String(form.get("recurrence")),
          },
    );
    if (result) router.push(`/workspace/${firmId}/obligations/${result.id}`);
  }
  return (
    <form onSubmit={submit} className="workspace-form">
      {!obligation && (
        <>
          {!companyId && (
            <label className="field-label">
              Company
              <select name="companyId" required defaultValue="">
                <option value="" disabled>
                  Choose company
                </option>
                {options?.companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="field-label">
            Reusable template (optional)
            <select
              value={templateId}
              onChange={(event) => chooseTemplate(event.target.value)}
            >
              <option value="">Custom obligation</option>
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
              {selected &&
                !templates.some((template) => template.id === selected.id) && (
                  <option value={selected.id}>{selected.name}</option>
                )}
            </select>
          </label>
          <p className="workspace-note">
            This selector shows the first template-library page.{" "}
            <Link className="text-link" href={`/workspace/${firmId}/templates`}>
              Browse all templates
            </Link>{" "}
            and choose “Use template” for any other template.
          </p>
        </>
      )}
      <label className="field-label">
        Obligation title
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          required
          minLength={2}
          maxLength={200}
        />
      </label>
      <label className="field-label">
        Instructions
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          maxLength={4000}
          rows={4}
        />
      </label>
      <label className="field-label">
        Reporting period
        <input
          name="reportingPeriod"
          defaultValue={obligation?.reportingPeriod ?? ""}
          placeholder="e.g. October 2026 or FY 2026–27"
          required
          maxLength={100}
        />
      </label>
      <label className="field-label">
        Confirmed due date
        <input
          name="dueDate"
          type="date"
          defaultValue={obligation?.dueDate}
          min="2000-01-01"
          max="2199-12-31"
          required
        />
      </label>
      {!obligation && (
        <label className="field-label">
          Recurrence
          <select name="recurrence" defaultValue="none">
            <option value="none">One-off</option>
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
            <option value="annual">Annual</option>
          </select>
        </label>
      )}
      <label className="work-check">
        <input name="confirmed" type="checkbox" required />I have checked and
        confirm this due date. It is not a verified statutory calculation.
      </label>
      <p className="workspace-note">
        Changing this deadline does not reschedule existing tasks. Recurrence
        keeps the original anchor date; each next occurrence requires
        confirmation.
      </p>
      <WorkFeedback error={mutation.error} />
      <Button type="submit" disabled={mutation.pending}>
        {mutation.pending
          ? "Saving…"
          : obligation
            ? "Save obligation"
            : "Create obligation"}
      </Button>
    </form>
  );
}

export function NextOccurrenceForm({
  firmId,
  obligationId,
  suggestedDate,
}: {
  firmId: string;
  obligationId: string;
  suggestedDate: string;
}) {
  const router = useRouter();
  const mutation = useWorkMutation();
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const result = await mutation.run<{
      obligation: { id: string };
      alreadyExists: boolean;
    }>(`/api/firms/${firmId}/obligations/${obligationId}/next`, "POST", {
      dueDate: String(form.get("dueDate")),
      reportingPeriod: String(form.get("reportingPeriod")),
      confirmed: form.get("confirmed") === "on",
    });
    if (result)
      router.push(`/workspace/${firmId}/obligations/${result.obligation.id}`);
  }
  return (
    <form onSubmit={submit} className="workspace-form">
      <p className="workspace-note">
        Confirm the proposed date and enter the next reporting period. If this
        next occurrence already exists, it will open instead of creating a
        duplicate.
      </p>
      <label className="field-label">
        Next reporting period
        <input name="reportingPeriod" required maxLength={100} />
      </label>
      <label className="field-label">
        Next due date
        <input
          name="dueDate"
          type="date"
          defaultValue={suggestedDate}
          min="2000-01-01"
          max="2199-12-31"
          required
        />
      </label>
      <label className="work-check">
        <input type="checkbox" name="confirmed" required />I have checked and
        confirm the next due date.
      </label>
      <WorkFeedback error={mutation.error} />
      <Button type="submit" disabled={mutation.pending}>
        {mutation.pending ? "Creating…" : "Create or open next occurrence"}
      </Button>
    </form>
  );
}
