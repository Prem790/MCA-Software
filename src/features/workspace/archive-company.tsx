"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { workspaceRequest } from "./api-client";
export function ArchiveCompany({
  firmId,
  companyId,
  archived,
}: {
  firmId: string;
  companyId: string;
  archived: boolean;
}) {
  const [confirm, setConfirm] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  return (
    <div className="archive-controls">
      <p className="workspace-note">
        {archived
          ? "Restore this company to allow updates again."
          : "Archiving removes this company from the active list and disables edits. Its records and history remain available."}
      </p>
      {!confirm ? (
        <Button variant="outline" onClick={() => setConfirm(true)}>
          {archived ? "Restore company" : "Archive company"}
        </Button>
      ) : (
        <div className="workspace-actions">
          <span>Confirm {archived ? "restore" : "archive"}?</span>
          <Button
            variant="outline"
            disabled={pending}
            onClick={async () => {
              setPending(true);
              setError("");
              try {
                await workspaceRequest(
                  `/api/firms/${firmId}/companies/${companyId}${archived ? "/restore" : ""}`,
                  archived ? "POST" : "DELETE",
                );
                setConfirm(false);
                router.refresh();
              } catch (error) {
                setError(
                  error instanceof Error ? error.message : "Request failed.",
                );
              } finally {
                setPending(false);
              }
            }}
          >
            {pending ? "Saving…" : "Confirm"}
          </Button>
          <Button
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
    </div>
  );
}
