"use client";
import { useRef, useState, useTransition, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import type { InvitationPreview } from "@/modules/firms/team-contracts";
import { workspaceRequest } from "@/features/workspace/api-client";
import { authClient } from "./auth-client";
import { AccountCard } from "./account-card";
import { PasswordField } from "./password-field";
import { PasswordFields } from "./password-recovery";
import { memberRoleLabels } from "@/features/workspace/navigation";
import { useLinkToken } from "./use-link-token";

export function AcceptInvitation() {
  const router = useRouter();
  const token = useLinkToken();
  const [preview, setPreview] = useState<InvitationPreview | null>(null);
  const [saving, setPending] = useState(false);
  const [opening, startTransition] = useTransition();
  const pending = saving || opening;
  const busy = useRef(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  async function inspect() {
    if (busy.current || pending || !token) return;
    busy.current = true;
    setPending(true);
    setError("");
    try {
      setPreview(
        await workspaceRequest<InvitationPreview>(
          "/api/invitations/inspect",
          "POST",
          { token },
        ),
      );
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Could not read this invitation.",
      );
    } finally {
      busy.current = false;
      setPending(false);
    }
  }
  async function accept(form?: FormData) {
    if (!preview || busy.current || pending) return;
    busy.current = true;
    setPending(true);
    setError("");
    try {
      if (preview.requiresSignIn && form) {
        const result = await authClient.signIn.email({
          email: preview.email,
          password: String(form.get("password")),
        });
        if (result.error)
          throw new Error(
            "Sign-in failed. Check your password, or use password recovery.",
          );
      }
      const result = await workspaceRequest<{ firmId: string }>(
        "/api/invitations/accept",
        "POST",
        {
          token,
          ...(!preview.requiresSignIn && form
            ? {
                name: String(form.get("name")),
                password: String(form.get("password")),
              }
            : {}),
        },
      );
      if (preview.requiresSignIn) {
        startTransition(() => {
          router.replace(`/workspace/${result.firmId}/dashboard`);
          router.refresh();
        });
      } else setDone(true);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Could not accept this invitation.",
      );
    } finally {
      busy.current = false;
      setPending(false);
    }
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (
      !preview?.requiresSignIn &&
      form.get("password") !== form.get("confirmation")
    ) {
      setError("Passwords do not match.");
      return;
    }
    void accept(form);
  }
  async function signOut() {
    if (busy.current || pending) return;
    busy.current = true;
    setPending(true);
    setError("");
    try {
      const result = await authClient.signOut();
      if (result.error) throw new Error();
    } catch {
      setError("Could not sign out. Please retry.");
    } finally {
      busy.current = false;
      setPending(false);
    }
  }
  return (
    <AccountCard title="Join your firm">
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {done ? (
        <p className="workspace-readonly" role="status">
          Your account is ready. Sign in with {preview?.email} and the password
          you just chose.
        </p>
      ) : token === null ? (
        <p role="status">Reading invitation…</p>
      ) : !token ? (
        <p>
          Open the complete invitation link from your email. If you refreshed
          this page, reopen the email link.
        </p>
      ) : !preview ? (
        <div className="workspace-form" aria-busy={pending}>
          <p>Review your invitation before joining.</p>
          <Button disabled={pending} onClick={inspect}>
            {pending ? "Loading…" : "Review invitation"}
          </Button>
        </div>
      ) : (
        <>
          <p>
            Invitation to <strong>{preview.firmName}</strong> as{" "}
            <strong>{memberRoleLabels[preview.role]}</strong> for{" "}
            {preview.email}.
          </p>
          {preview.requiresSignIn ? (
            <>
              <p className="workspace-note">
                You already have an account. Sign in below or accept using your
                current session. This invitation will not change your existing
                password.
              </p>
              <form
                onSubmit={submit}
                className="workspace-form"
                aria-busy={pending}
              >
                <label className="field-label">
                  Invited email
                  <input
                    type="email"
                    value={preview.email}
                    autoComplete="username"
                    readOnly
                  />
                </label>
                <PasswordField
                  label="Current password"
                  name="password"
                  autoComplete="current-password"
                  required
                  maxLength={128}
                  disabled={pending}
                />
                <Button type="submit" disabled={pending}>
                  {opening
                    ? "Opening workspace…"
                    : pending
                      ? "Joining…"
                      : "Sign in and accept"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={pending}
                  onClick={() => accept()}
                >
                  Accept using current session
                </Button>
              </form>
              <p className="workspace-note">
                <Link
                  className="identity-text-link"
                  href="/forgot-password"
                  target="_blank"
                  rel="noreferrer"
                >
                  Forgot your password? Open recovery in another tab
                </Link>
              </p>
            </>
          ) : (
            <form
              onSubmit={submit}
              className="workspace-form"
              aria-busy={pending}
            >
              <label className="field-label">
                Your name
                <input
                  name="name"
                  autoComplete="name"
                  disabled={pending}
                  minLength={2}
                  maxLength={200}
                  required
                />
              </label>
              <PasswordFields disabled={pending} />
              <Button type="submit" disabled={pending}>
                {pending ? "Creating account…" : "Create account and join"}
              </Button>
            </form>
          )}
          <p className="workspace-note">
            Signed in as a different person? Sign out here, then continue with
            this invitation.
          </p>
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={signOut}
          >
            Sign out current account
          </Button>
        </>
      )}
      <p
        className="identity-progress"
        role={opening ? "status" : undefined}
        aria-live="polite"
      >
        {opening ? "Opening your firm workspace…" : ""}
      </p>
    </AccountCard>
  );
}
