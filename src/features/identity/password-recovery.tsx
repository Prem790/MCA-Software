"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AccountCard } from "./account-card";
import { authClient } from "./auth-client";
import { useLinkToken } from "./use-link-token";

export function ForgotPassword({
  emailConfigured,
}: {
  emailConfigured: boolean;
}) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    setMessage("");
    const email = String(new FormData(event.currentTarget).get("email"))
      .trim()
      .toLowerCase();
    try {
      const result = await authClient.requestPasswordReset({
        email,
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (result.error) throw new Error();
      setMessage(
        "If an account exists for that address, a reset email has been requested. Check your inbox and spam folder. If nothing arrives, contact your administrator.",
      );
    } catch {
      setError(
        "Could not request password recovery. Wait a minute and try again, or contact your administrator.",
      );
    } finally {
      setPending(false);
    }
  }
  return (
    <AccountCard title="Forgot your password?">
      <p>
        Enter your account email address to request a link. Links expire after
        one hour.
      </p>
      {!emailConfigured && (
        <p className="workspace-readonly">
          Email recovery is not configured yet. Contact your administrator.
        </p>
      )}
      <form onSubmit={submit} className="workspace-form">
        <label className="field-label">
          Email address
          <input
            name="email"
            type="email"
            autoComplete="username"
            required
            maxLength={254}
            disabled={!emailConfigured || pending}
          />
        </label>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        {message && (
          <p className="workspace-readonly" role="status">
            {message}
          </p>
        )}
        <Button type="submit" disabled={!emailConfigured || pending}>
          {pending ? "Requesting…" : "Request reset link"}
        </Button>
      </form>
    </AccountCard>
  );
}

export function ResetPassword() {
  const token = useLinkToken();
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password"));
    if (password !== String(form.get("confirmation"))) {
      setError("Passwords do not match.");
      return;
    }
    if (!token) return;
    setPending(true);
    try {
      const result = await authClient.resetPassword({
        token,
        newPassword: password,
      });
      if (result.error) throw new Error();
      setDone(true);
    } catch {
      setError(
        "The reset link may be expired or already used. Request another link, or wait a minute before retrying.",
      );
    } finally {
      setPending(false);
    }
  }
  return (
    <AccountCard title="Choose a new password">
      {token === null ? (
        <p role="status">Reading reset link…</p>
      ) : !token ? (
        <p className="form-error" role="alert">
          Open the complete link from your reset email. If you refreshed this
          page, reopen the email link.
        </p>
      ) : done ? (
        <p className="workspace-readonly" role="status">
          Password changed. Your previous sessions have been revoked. Sign in
          with your new password.
        </p>
      ) : (
        <form onSubmit={submit} className="workspace-form">
          <PasswordFields />
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Reset password"}
          </Button>
        </form>
      )}
      {!done && (
        <p className="workspace-note">
          <Link href="/forgot-password">Request another reset link</Link>
        </p>
      )}
    </AccountCard>
  );
}

export function PasswordFields() {
  return (
    <>
      <label className="field-label">
        New password (12–128 characters)
        <input
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={12}
          maxLength={128}
          required
        />
      </label>
      <label className="field-label">
        Confirm password
        <input
          name="confirmation"
          type="password"
          autoComplete="new-password"
          minLength={12}
          maxLength={128}
          required
        />
      </label>
    </>
  );
}
