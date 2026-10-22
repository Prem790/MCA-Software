"use client";
import { Button } from "@/components/ui/button";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <section className="panel workspace-panel">
      <h1>The workspace could not load</h1>
      <p>
        Check that the development database is reachable and migrations have
        been applied, then try again.
      </p>
      <Button onClick={reset}>Try again</Button>
    </section>
  );
}
