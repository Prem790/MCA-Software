"use client";
import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { MAX_DOCUMENT_BYTES } from "@/modules/documents/contracts";
import { uploadWorkspaceDocument } from "./api-client";
import { WorkFeedback } from "./work-feedback";
export function DocumentUpload({
  firmId,
  companyId,
  taskId,
  version,
}: {
  firmId: string;
  companyId: string;
  taskId?: string;
  version?: number;
}) {
  const router = useRouter();
  const busy = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current) return;
    const element = event.currentTarget;
    const file = new FormData(element).get("file");
    if (
      !(file instanceof File) ||
      !file.size ||
      file.size > MAX_DOCUMENT_BYTES
    ) {
      setError("Choose a non-empty file up to 3 MB.");
      return;
    }
    busy.current = true;
    setPending(true);
    setError("");
    setSaved(false);
    try {
      const query = new URLSearchParams({ companyId, name: file.name });
      if (taskId) {
        query.set("taskId", taskId);
        query.set("version", String(version));
      }
      await uploadWorkspaceDocument(
        `/api/firms/${firmId}/documents?${query}`,
        file,
      );
      element.reset();
      setSaved(true);
      router.refresh();
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Upload failed. Refresh before retrying.",
      );
    } finally {
      busy.current = false;
      setPending(false);
    }
  }
  return (
    <form className="workspace-form" onSubmit={submit}>
      <label className="field-label">
        Upload supporting document
        <input
          type="file"
          name="file"
          required
          accept=".pdf,.png,.jpg,.jpeg,.txt"
        />
      </label>
      <p className="workspace-note">
        PDF, PNG, JPEG or UTF-8 text · up to 3 MB. Files are retained as
        evidence; upload a corrected file rather than replacing history.
      </p>
      <WorkFeedback error={error} />
      {saved && <p role="status">Document uploaded.</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Uploading…" : "Upload privately"}
      </Button>
    </form>
  );
}
