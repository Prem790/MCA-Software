import Link from "next/link";
import { ArrowRight, Check, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FieldLabel } from "./components";

export function LoginPreview() {
  return (
    <main className="login-page">
      <section className="login-story">
        <Link href="/preview" className="brand">
          <span className="brand-symbol">
            <ShieldCheck size={23} aria-hidden="true" />
          </span>
          <span>
            MCA<span className="brand-light">Software</span>
          </span>
        </Link>
        <div className="login-story-main">
          <span className="login-eyebrow">LESS FOLLOW-UP. MORE CLARITY.</span>
          <h1>
            Every company.
            <br />
            Every deadline.
            <br />
            <span>One clear view.</span>
          </h1>
          <p>A calmer way to manage the work behind corporate compliance.</p>
          <div className="login-illustration" aria-hidden="true">
            <div>
              <span className="illustration-check">
                <Check size={17} />
              </span>
              <span>
                <strong>Records reviewed</strong>
                <small>One less thing on your list</small>
              </span>
              <span className="illustration-complete">Complete</span>
            </div>
            <div>
              <span className="illustration-check">
                <Check size={17} />
              </span>
              <span>
                <strong>Ready for the next step</strong>
                <small>Your team, working together</small>
              </span>
            </div>
          </div>
        </div>
        <p className="login-story-footer">
          Built around the way professional teams work.
        </p>
      </section>
      <section className="login-form-area">
        <div className="login-form-card">
          <span className="outline-badge">Phase 1 · Interface preview</span>
          <h2>Welcome to your workspace</h2>
          <p>Here’s a preview of how your team will sign in.</p>
          <div className="login-fields">
            <FieldLabel label="Email address">
              <input type="email" placeholder="you@yourfirm.com" disabled />
            </FieldLabel>
            <FieldLabel label="Password">
              <input
                type="password"
                placeholder="Sign-in is not enabled yet"
                disabled
              />
            </FieldLabel>
            <Button disabled className="w-full">
              Sign in
            </Button>
          </div>
          <div className="login-preview-divider">
            <span>EXPLORE WITHOUT AN ACCOUNT</span>
          </div>
          <Button asChild className="w-full">
            <Link href="/preview">
              Open sample workspace
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </Button>
          <p className="login-preview-note">
            No credentials needed. All records are fictional and preview changes
            are not saved.
          </p>
          <p className="login-small-print">
            MCA Software is an independent product.
            <br />
            It is not affiliated with a government authority.
          </p>
        </div>
      </section>
    </main>
  );
}
