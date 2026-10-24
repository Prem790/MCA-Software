import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  ListChecks,
  ShieldCheck,
} from "lucide-react";

export function AccountCard({
  title,
  description,
  showSignInLink = true,
  children,
}: {
  title: string;
  description?: string;
  showSignInLink?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="identity-page">
      <a className="skip-link" href="#account-content">
        Skip to account form
      </a>
      <header className="identity-header">
        <Link href="/" className="brand">
          <span className="brand-symbol">
            <ShieldCheck size={22} aria-hidden="true" />
          </span>
          MCA Software
        </Link>
        <Link href="/" className="identity-home-link">
          <ArrowLeft size={16} aria-hidden="true" />
          Back to homepage
        </Link>
      </header>
      <main className="identity-layout" id="account-content" tabIndex={-1}>
        <aside className="identity-overview" aria-label="Workspace overview">
          <p className="identity-overline">
            <span aria-hidden="true" /> BUILT FOR SECRETARIAL PRACTICE
          </p>
          <h2>
            Your practice.
            <br />
            <span>Connected.</span>
          </h2>
          <p className="identity-overview-copy">
            One place for your company records, your team’s work and the
            evidence behind every approval.
          </p>
          <div className="identity-benefits">
            {[
              {
                icon: Building2,
                title: "Company records, together",
                detail: "Keep the details and the people connected.",
              },
              {
                icon: ListChecks,
                title: "A clear next step",
                detail: "Follow assignments, dates and daily progress.",
              },
              {
                icon: ShieldCheck,
                title: "Review with context",
                detail: "Keep documents and decisions beside the work.",
              },
            ].map(({ icon: Icon, title: benefit, detail }) => (
              <div className="identity-benefit" key={benefit}>
                <span>
                  <Icon size={20} aria-hidden="true" />
                </span>
                <div>
                  <strong>{benefit}</strong>
                  <p>{detail}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="identity-overview-note">
            Your firm. Your records. One shared workspace.
          </p>
        </aside>
        <section className="identity-card" aria-labelledby="account-title">
          <div className="identity-card-heading">
            <p className="identity-eyebrow">YOUR FIRM’S WORKSPACE</p>
            <h1 id="account-title">{title}</h1>
            {description && (
              <p className="identity-description">{description}</p>
            )}
          </div>
          {children}
          {showSignInLink && (
            <Link className="identity-return-link" href="/login">
              Back to sign in <ArrowRight size={16} aria-hidden="true" />
            </Link>
          )}
        </section>
      </main>
      <footer className="identity-footer">
        MCA Software · Independent practice management
      </footer>
    </div>
  );
}
