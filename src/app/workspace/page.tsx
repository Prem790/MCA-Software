import Link from "next/link";
import { ArrowRight, Building2, ShieldCheck } from "lucide-react";
import {
  firmInitials,
  memberRoleLabels,
} from "@/features/workspace/navigation";
import { readRuntimeConfig } from "@/platform/configuration/env";
import { pageSession } from "@/platform/auth/page-session";
import { firms } from "@/platform/application/services";
export default async function WorkspaceHome() {
  if (readRuntimeConfig().APP_MODE !== "application")
    return (
      <section className="panel workspace-panel">
        <h1>Sign-in is unavailable</h1>
        <p>
          Your workspace is not ready for sign-in yet. Contact the person who
          manages your firm’s access.
        </p>
        <Link href="/" className="text-link">
          Back to homepage
        </Link>
      </section>
    );
  const session = await pageSession();
  const memberships = await firms().listForUser(session.user.id);
  return (
    <section className="firm-chooser" aria-labelledby="firm-chooser-title">
      <div className="page-heading">
        <div>
          <p className="eyebrow">YOUR WORKSPACE</p>
          <h1 id="firm-chooser-title">Choose your firm</h1>
          <p className="page-description">
            Open a workspace to manage its companies, work and documents.
          </p>
        </div>
      </div>
      {memberships.length ? (
        <div className="firm-grid">
          {memberships.map((firm) => (
            <Link
              href={`/workspace/${firm.id}/dashboard`}
              key={firm.id}
              className="workspace-firm-card"
            >
              <div className="workspace-firm-card-top">
                <span className="firm-avatar" aria-hidden="true">
                  {firmInitials(firm.name)}
                </span>
                <span className="firm-role-badge" data-role={firm.role}>
                  <ShieldCheck size={14} aria-hidden="true" />
                  {memberRoleLabels[firm.role]}
                </span>
              </div>
              <h2>{firm.name}</h2>
              <p className="firm-card-description">
                Company records, work and reviews
              </p>
              <span className="firm-card-action">
                Open firm dashboard <ArrowRight size={18} aria-hidden="true" />
              </span>
            </Link>
          ))}
        </div>
      ) : (
        <section className="firm-access-empty">
          <Building2 size={28} aria-hidden="true" />
          <h2>No firm access yet</h2>
          <p>
            Your account is signed in but has no firm membership. Contact your
            administrator.
          </p>
        </section>
      )}
      <p className="firm-access-help">
        Only firms with an active membership appear here. Missing a firm?
        Contact its administrator.
      </p>
    </section>
  );
}
