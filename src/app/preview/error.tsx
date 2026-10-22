"use client";
import { Button } from "@/components/ui/button";
export default function PreviewError({ reset }: { reset: () => void }) {
  return (
    <div className="empty-state">
      <h1>The preview couldn’t load</h1>
      <p>Please try again. No changes have been saved.</p>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
