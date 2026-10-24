"use client";
import { Button } from "@/components/ui/button";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <section className="panel workspace-panel">
      <h1>The workspace could not load</h1>
      <p>
        Please try again. If the problem continues, contact your firm
        administrator.
      </p>
      <Button onClick={reset}>Try again</Button>
    </section>
  );
}
