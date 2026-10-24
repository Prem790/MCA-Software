"use client";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { workspaceRequest } from "./api-client";
export function useWorkMutation() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [refreshing, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const busy = useRef(false);
  const pending = saving || refreshing;
  async function run<T>(
    path: string,
    method: string,
    body?: unknown,
    options?: { navigateTo?: (result: T) => string; successMessage?: string },
  ): Promise<T | null> {
    if (busy.current || pending) return null;
    busy.current = true;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const result = await workspaceRequest<T>(path, method, body);
      setNotice(options?.successMessage ?? "Changes saved.");
      startTransition(() => {
        if (options?.navigateTo) router.push(options.navigateTo(result));
        router.refresh();
      });
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
      setSaving(false);
    }
  }
  return { pending, error, notice, run };
}
