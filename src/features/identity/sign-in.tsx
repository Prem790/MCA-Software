"use client";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { authClient } from "./auth-client";

export function SignIn() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const result = await authClient.signIn.email({
        email: String(form.get("email")).trim(),
        password: String(form.get("password")),
      });
      if (result.error) {
        setError(
          "Sign-in failed. Check your email and password, or try again later.",
        );
        return;
      }
      router.replace("/workspace");
      router.refresh();
    } catch {
      setError("Could not reach sign-in. Please try again.");
    } finally {
      setPending(false);
    }
  }
  return (
    <main className="identity-page">
      <div className="identity-card">
        <Link href="/" className="brand">
          <span className="brand-symbol">
            <ShieldCheck size={22} aria-hidden="true" />
          </span>
          MCA Software
        </Link>
        <p className="eyebrow">YOUR FIRM’S WORKSPACE</p>
        <h1>Welcome back</h1>
        <p>Sign in with the account provisioned for your firm.</p>
        <form onSubmit={submit} aria-label="Sign in" className="workspace-form">
          <label className="field-label">
            Email address
            <input
              name="email"
              type="email"
              autoComplete="username"
              required
              maxLength={254}
            />
          </label>
          <label className="field-label">
            Password
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              required
              maxLength={128}
            />
          </label>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <Button type="submit" disabled={pending}>
            {pending ? "Signing in…" : "Sign in"}
          </Button>
        </form>
        <p className="workspace-note">
          Account invitations and password recovery are coming in a later Phase
          2 increment. Contact your administrator for account setup.
        </p>
        <Link href="/preview" className="text-link">
          Explore the fictional preview
        </Link>
      </div>
    </main>
  );
}
