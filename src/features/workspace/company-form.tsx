"use client";
import type { FormEvent } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import type { CompanyRecord } from "@/modules/companies";
import { useWorkMutation } from "./use-work-mutation";
import { WorkFeedback } from "./work-feedback";

export function CompanyForm({
  firmId,
  company,
}: {
  firmId: string;
  company?: CompanyRecord;
}) {
  const mutation = useWorkMutation();
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = Object.fromEntries(new FormData(event.currentTarget));
    await mutation.run<{ id: string }>(
      `/api/firms/${firmId}/companies${company ? `/${company.id}` : ""}`,
      company ? "PATCH" : "POST",
      fields,
      {
        successMessage: "Company details saved.",
        ...(!company
          ? {
              navigateTo: (saved: { id: string }) =>
                `/workspace/${firmId}/companies/${saved.id}`,
            }
          : {}),
      },
    );
  }
  const supportedTypes = ["Private company", "Public company", "LLP", "Other"];
  return (
    <form
      onSubmit={submit}
      className="workspace-form workflow-form"
      aria-busy={mutation.pending}
      aria-label={company ? "Edit company" : "Create company"}
    >
      <fieldset className="workflow-fields" disabled={mutation.pending}>
        <legend>Company details</legend>
        <p className="form-guidance">Fields marked * are required.</p>
        <p className="form-guidance">
          Enter the legal company name and type. Other details are optional.
        </p>
        <div className="form-grid">
          <label className="field-label">
            <span className="field-caption">
              Company name{" "}
              <span className="required-mark" aria-hidden="true">
                *
              </span>
            </span>
            <input
              name="name"
              defaultValue={company?.name ?? ""}
              minLength={2}
              maxLength={200}
              required
            />
          </label>
          <label className="field-label">
            Company type
            <select
              name="companyType"
              defaultValue={
                company?.companyType &&
                supportedTypes.includes(company.companyType)
                  ? company.companyType
                  : "Private company"
              }
            >
              {supportedTypes.map((type) => (
                <option key={type}>{type}</option>
              ))}
            </select>
          </label>
          <label className="field-label">
            CIN (optional)
            <input
              name="cin"
              defaultValue={company?.cin ?? ""}
              pattern="[A-Z0-9]{21}"
              maxLength={21}
              title="21 uppercase letters or digits"
            />
          </label>
          <label className="field-label">
            Contact email (optional)
            <input
              name="contactEmail"
              type="email"
              maxLength={254}
              defaultValue={company?.contactEmail ?? ""}
            />
          </label>
        </div>
        <label className="field-label">
          Address (optional)
          <textarea
            name="address"
            rows={3}
            maxLength={1000}
            defaultValue={company?.address ?? ""}
          />
        </label>
        <p className="workspace-note">
          Identifiers are checked for format only. Company identity and
          regulatory applicability are not verified automatically.
        </p>
      </fieldset>
      <WorkFeedback error={mutation.error} notice={mutation.notice} />
      <div className="form-actions">
        <Button type="submit" disabled={mutation.pending}>
          {mutation.pending
            ? "Saving…"
            : company
              ? "Save company"
              : "Create company"}
        </Button>
        {!company && !mutation.pending && (
          <Link href={`/workspace/${firmId}/companies`} className="form-cancel">
            Cancel
          </Link>
        )}
      </div>
    </form>
  );
}
