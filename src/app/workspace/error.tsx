"use client";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { EdgeState } from "@/features/workspace/edge-state";
export default function ErrorPage({ reset }: { reset: () => void }) {
  const [pending, startTransition] = useTransition();
  return (
    <EdgeState
      title="The workspace could not load"
      action={
        <Button
          disabled={pending}
          onClick={() => startTransition(() => reset())}
        >
          {pending ? "Trying again…" : "Try again"}
        </Button>
      }
    >
      Please try again. If the problem continues, contact your firm
      administrator. You can return to your firms and try opening the workspace
      again.
    </EdgeState>
  );
}
