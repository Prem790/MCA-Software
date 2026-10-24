"use client";
import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CircleHelp, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AccountCard } from "./account-card";
import { PasswordField } from "./password-field";
import { authClient } from "./auth-client";

export function SignIn() {
  const router = useRouter();
  const busy = useRef(false);
  const [phase, setPhase] = useState<"idle" | "submitting" | "redirecting">(
    "idle",
  );
  const [error, setError] = useState("");
  const pending = phase !== "idle";
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current) return;
    const form = new FormData(event.currentTarget);
    busy.current = true;
    setPhase("submitting");
    setError("");
    try {
      const result = await authClient.signIn.email({
        email: String(form.get("email")).trim(),
        password: String(form.get("password")),
      });
      if (result.error) {
        setError(
          "Sign-in failed. Check your email and password, or try again later.",
        );
        busy.current = false;
        setPhase("idle");
        return;
      }
      // Keep the form busy until navigation unmounts it, not just until the API returns.
      setPhase("redirecting");
      router.replace("/workspace");
      router.refresh();
    } catch {
      setError("Could not complete sign-in. Please try again.");
      busy.current = false;
      setPhase("idle");
    }
  }
  return (
    <AccountCard
      title="Welcome back"
      description="Sign in to pick up where your team left off."
      showSignInLink={false}
    >
      <form
        onSubmit={submit}
        aria-label="Sign in"
        aria-busy={pending}
        className="workspace-form identity-form"
      >
        <label className="field-label">
          Email address
          <input
            name="email"
            type="email"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            required
            maxLength={254}
            disabled={pending}
          />
        </label>
        <PasswordField
          label="Password"
          name="password"
          autoComplete="current-password"
          required
          maxLength={128}
          disabled={pending}
          action={
            <Link href="/forgot-password" className="identity-text-link">
              Forgot your password?
            </Link>
          }
        />
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <Button type="submit" disabled={pending} className="identity-submit">
          {pending && (
            <LoaderCircle size={18} className="ui-spinner" aria-hidden="true" />
          )}
          {phase === "redirecting"
            ? "Opening workspace…"
            : pending
              ? "Signing in…"
              : "Sign in"}
          {!pending && <ArrowRight size={18} aria-hidden="true" />}
        </Button>
      </form>
      <p
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="identity-progress"
      >
        {phase === "submitting"
          ? "Checking your account details…"
          : phase === "redirecting"
            ? "Signed in. Opening your workspace…"
            : ""}
      </p>
      <div className="identity-access-note">
        <CircleHelp size={18} aria-hidden="true" />
        <p>
          <strong>Need access?</strong> Your firm administrator can help you get
          started.
        </p>
      </div>
    </AccountCard>
  );
}
