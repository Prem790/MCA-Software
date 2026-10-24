"use client";
import { useRef, useState, useTransition } from "react";
import { Download, LoaderCircle, RefreshCw } from "lucide-react";
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
  const [message, setMessage] = useState("");
  async function download() {
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    setError("");
    setMessage("");
    try {
      await downloadWorkspaceReport(url, filename);
      setMessage(
        "Download started. Check your browser’s downloads for the filtered CSV.",
      );
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
    <div
      className="report-export-control"
      role="group"
      aria-label="Report export"
    >
      <Button
        type="button"
        variant="outline"
        onClick={download}
        disabled={pending}
      >
        {pending ? (
          <LoaderCircle size={17} className="ui-spinner" aria-hidden="true" />
        ) : (
          <Download size={17} aria-hidden="true" />
        )}
        {pending ? "Preparing CSV…" : "Download filtered CSV"}
      </Button>
      <p className="export-feedback" role="status" aria-live="polite">
        {pending ? "Preparing the matching records. Please wait…" : message}
      </p>
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
      <RefreshCw
        size={16}
        className={pending ? "ui-spinner" : undefined}
        aria-hidden="true"
      />
      {pending ? "Refreshing…" : "Refresh dashboard"}
    </Button>
  );
}
