"use client";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { useWorkMutation } from "./use-work-mutation";
import { WorkFeedback } from "./work-feedback";
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
  const mutation = useWorkMutation();
  return (
    <div className="archive-controls">
      <p className="workspace-note">
        {archived
          ? "Restore this company to allow updates again."
          : "Archiving removes this company from the active list and disables edits. Its records and history remain available."}
      </p>
      {!confirm ? (
        <Button
          variant="outline"
          disabled={mutation.pending}
          onClick={() => setConfirm(true)}
        >
          {archived ? "Restore company" : "Archive company"}
        </Button>
      ) : (
        <div className="workspace-actions workflow-confirmation">
          <span>Confirm {archived ? "restore" : "archive"}?</span>
          <Button
            variant="outline"
            disabled={mutation.pending}
            onClick={async () => {
              const result = await mutation.run(
                `/api/firms/${firmId}/companies/${companyId}${archived ? "/restore" : ""}`,
                archived ? "POST" : "DELETE",
              );
              if (result) setConfirm(false);
            }}
          >
            {mutation.pending ? "Saving…" : "Confirm"}
          </Button>
          <Button
            variant="outline"
            disabled={mutation.pending}
            onClick={() => setConfirm(false)}
          >
            Cancel
          </Button>
        </div>
      )}
      <WorkFeedback error={mutation.error} />
    </div>
  );
}
