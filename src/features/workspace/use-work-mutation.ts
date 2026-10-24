"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { workspaceRequest } from "./api-client";
export function useWorkMutation() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const busy = useRef(false);
  async function run<T>(
    path: string,
    method: string,
    body?: unknown,
  ): Promise<T | null> {
    if (busy.current) return null;
    busy.current = true;
    setPending(true);
    setError("");
    try {
      const result = await workspaceRequest<T>(path, method, body);
      router.refresh();
      return result;
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Could not save this change.",
      );
      return null;
    } finally {
      busy.current = false;
      setPending(false);
    }
  }
  return { pending, error, run };
}
