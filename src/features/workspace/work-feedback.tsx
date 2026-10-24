"use client";
import { useRouter } from "next/navigation";
export function WorkFeedback({ error }: { error: string }) {
  const router = useRouter();
  if (!error) return null;
  return (
    <div className="form-error" role="alert">
      <p>{error}</p>
      <button
        type="button"
        className="text-link"
        onClick={() => router.refresh()}
      >
        Refresh saved data
      </button>
    </div>
  );
}
