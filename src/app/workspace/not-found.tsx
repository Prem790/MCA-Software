import { EdgeState } from "@/features/workspace/edge-state";
export default function NotFound() {
  return (
    <EdgeState title="Workspace record not found">
      This record is unavailable in your firm. It may have moved, or your
      account may not have access. Return to your firms to continue.
    </EdgeState>
  );
}
