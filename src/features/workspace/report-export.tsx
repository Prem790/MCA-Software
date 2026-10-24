"use client";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { downloadWorkspaceReport } from "./api-client";
import { WorkFeedback } from "./work-feedback";
export function ReportExport({
  url,
  filename,
}: {
  url: string;
  filename: string;
}) {
  const busy = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function download() {
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    setError("");
    try {
      await downloadWorkspaceReport(url, filename);
    } catch (failure) {
      setError(
        failure instanceof Error ? failure.message : "Report download failed.",
      );
    } finally {
      busy.current = false;
      setPending(false);
    }
  }
  return (
    <div>
      <Button
        type="button"
        variant="outline"
        onClick={download}
        disabled={pending}
      >
        {pending ? "Preparing CSV…" : "Download filtered CSV"}
      </Button>
      <WorkFeedback error={error} />
    </div>
  );
}

export function ReportRefresh() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Button
      type="button"
      variant="outline"
      disabled={pending}
      onClick={() => startTransition(() => router.refresh())}
    >
      {pending ? "Refreshing…" : "Refresh dashboard"}
    </Button>
  );
}
