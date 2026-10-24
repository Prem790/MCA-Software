import { EdgeState } from "@/features/workspace/edge-state";
export default function Loading() {
  return (
    <EdgeState title="Loading your workspace" loading>
      <span role="status">Getting the latest saved records. Please wait…</span>
    </EdgeState>
  );
}
