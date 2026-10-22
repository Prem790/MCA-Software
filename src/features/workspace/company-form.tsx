"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import type { CompanyRecord } from "@/modules/companies";
import { workspaceRequest } from "./api-client";

export function CompanyForm({
  firmId,
  company,
}: {
  firmId: string;
  company?: CompanyRecord;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    setNotice("");
    const fields = Object.fromEntries(new FormData(event.currentTarget));
    const endpoint = `/api/firms/${firmId}/companies${company ? `/${company.id}` : ""}`;
    try {
      const saved = await workspaceRequest<{ id: string }>(
        endpoint,
        company ? "PATCH" : "POST",
        fields,
      );
      if (company) {
        setNotice("Company details saved.");
        router.refresh();
      } else {
        router.push(`/workspace/${firmId}/companies/${saved.id}`);
        router.refresh();
      }
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Could not save company details.",
      );
    } finally {
      setPending(false);
    }
  }
  const supportedTypes = ["Private company", "Public company", "LLP", "Other"];
  return (
    <form
      onSubmit={submit}
      className="workspace-form"
      aria-label={company ? "Edit company" : "Create company"}
    >
      <div className="form-grid">
        <label className="field-label">
          Company name
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
        Identifiers are checked for format only. Company identity and regulatory
        applicability are not verified automatically.
      </p>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="inline-success">
          {notice}
        </p>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : company ? "Save company" : "Create company"}
      </Button>
    </form>
  );
}
