"use client";
import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import type { DirectorRecord } from "@/modules/companies";
import { workspaceRequest } from "./api-client";

function DirectorForm({
  endpoint,
  director,
  onSaved,
}: {
  endpoint: string;
  director?: DirectorRecord;
  onSaved?: () => void;
}) {
  const [saving, setPending] = useState(false);
  const [refreshing, startTransition] = useTransition();
  const pending = saving || refreshing;
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const router = useRouter();
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    setNotice("");
    const form = event.currentTarget;
    try {
      await workspaceRequest(
        endpoint,
        director ? "PATCH" : "POST",
        Object.fromEntries(new FormData(form)),
      );
      setNotice(director ? "Director saved." : "Director added.");
      if (!director) form.reset();
      onSaved?.();
      startTransition(() => router.refresh());
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Could not save director.",
      );
    } finally {
      setPending(false);
    }
  }
  return (
    <form
      onSubmit={submit}
      className="workspace-form workflow-form"
      aria-busy={pending}
      aria-label={director ? `Edit director ${director.name}` : "Add director"}
    >
      <fieldset className="workflow-fields" disabled={pending}>
        <legend>Director details</legend>
        <div className="form-grid">
          <label className="field-label">
            Director name
            <input
              name="name"
              defaultValue={director?.name ?? ""}
              required
              minLength={2}
              maxLength={200}
            />
          </label>
          <label className="field-label">
            DIN (optional)
            <input
              name="din"
              defaultValue={director?.din ?? ""}
              pattern="[0-9]{8}"
              title="Eight digits"
              maxLength={8}
            />
          </label>
          <label className="field-label">
            Designation
            <input
              name="designation"
              defaultValue={director?.designation ?? "Director"}
              required
              minLength={2}
              maxLength={120}
            />
          </label>
        </div>
      </fieldset>
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
      <Button size="sm" disabled={pending} type="submit">
        {pending ? "Saving…" : director ? "Save director" : "Add director"}
      </Button>
    </form>
  );
}
function DirectorRow({
  endpoint,
  director,
  writable,
}: {
  endpoint: string;
  director: DirectorRecord;
  writable: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [saving, setPending] = useState(false);
  const [refreshing, startTransition] = useTransition();
  const pending = saving || refreshing;
  const [error, setError] = useState("");
  const router = useRouter();
  return (
    <li className="workspace-director">
      <div className="workspace-section-heading">
        <div>
          <h3>{director.name}</h3>
          <p>
            {director.designation} · DIN {director.din ?? "not provided"}
          </p>
        </div>
        {writable && (
          <div className="workspace-actions">
            <Button
              size="sm"
              variant="outline"
              disabled={pending}
              aria-expanded={editing}
              onClick={() => setEditing(!editing)}
            >
              {editing ? "Close edit" : `Edit ${director.name}`}
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={pending}
              aria-expanded={confirm}
              onClick={() => setConfirm(!confirm)}
            >
              Remove {director.name}
            </Button>
          </div>
        )}
      </div>
      {editing && (
        <DirectorForm
          endpoint={endpoint}
          director={director}
          onSaved={() => setEditing(false)}
        />
      )}
      {confirm && (
        <div className="workspace-actions workflow-confirmation">
          <span>
            Remove this company association? The director record is retained.
          </span>
          <Button
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={async () => {
              setPending(true);
              setError("");
              try {
                await workspaceRequest(endpoint, "DELETE");
                startTransition(() => router.refresh());
              } catch (error) {
                setError(
                  error instanceof Error
                    ? error.message
                    : "Could not remove director.",
                );
                setPending(false);
              }
            }}
          >
            {pending ? "Removing…" : "Confirm removal"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => setConfirm(false)}
          >
            Cancel
          </Button>
        </div>
      )}
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
    </li>
  );
}
export function Directors({
  firmId,
  companyId,
  directors,
  writable,
}: {
  firmId: string;
  companyId: string;
  directors: DirectorRecord[];
  writable: boolean;
}) {
  const endpoint = `/api/firms/${firmId}/companies/${companyId}/directors`;
  return (
    <div>
      <ul className="workspace-directors">
        {directors.map((person) => (
          <DirectorRow
            key={person.id}
            endpoint={`${endpoint}/${person.id}`}
            director={person}
            writable={writable}
          />
        ))}
      </ul>
      {!directors.length && (
        <p className="workspace-empty">
          No directors are associated with this company yet.
        </p>
      )}
      {writable && (
        <details className="workspace-add-director">
          <summary>Add a director</summary>
          <p className="workspace-note">
            A new firm-level director record will be created. An existing DIN
            will be rejected to prevent duplicate identities.
          </p>
          <DirectorForm endpoint={endpoint} />
        </details>
      )}
    </div>
  );
}
