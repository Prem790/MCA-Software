"use client";
import { LoaderCircle, LogOut } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { authClient } from "./auth-client";
export function SignOut() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  return (
    <div className="workspace-sign-out">
      <Button
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={async () => {
          setPending(true);
          setError("");
          try {
            const result = await authClient.signOut();
            if (result.error) throw new Error("Sign-out failed");
            router.replace("/");
            router.refresh();
          } catch {
            setError("Sign-out failed. Try again.");
            setPending(false);
          }
        }}
      >
        {pending ? (
          <LoaderCircle size={16} className="ui-spinner" aria-hidden="true" />
        ) : (
          <LogOut size={16} aria-hidden="true" />
        )}
        {pending ? "Signing out…" : "Sign out"}
      </Button>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
    </div>
  );
}
