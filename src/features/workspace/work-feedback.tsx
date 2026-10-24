"use client";
import Link from "next/link";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
export function WorkFeedback({
  error,
  notice = "",
}: {
  error: string;
  notice?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <>
      {error && (
        <div className="form-error work-feedback" role="alert">
          <p>{error}</p>
          <p className="feedback-hint">
            Your entries are kept here. Copy any unsaved edits before refreshing
            saved data.
          </p>
          {error.startsWith("Your session expired") && (
            <Link href="/login" className="form-cancel">
              Sign in again
            </Link>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() => startTransition(() => router.refresh())}
          >
            {pending ? "Refreshing…" : "Refresh saved data"}
          </Button>
        </div>
      )}
      {notice && !error && (
        <p className="inline-success" role="status">
          {notice}
        </p>
      )}
    </>
  );
}
