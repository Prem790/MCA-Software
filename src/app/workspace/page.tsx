import Link from "next/link";
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
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">YOUR WORKSPACE</p>
          <h1>Choose your firm</h1>
          <p className="page-description">
            Access is based on your current firm membership.
          </p>
        </div>
      </div>
      {memberships.length ? (
        <div className="firm-grid">
          {memberships.map((firm) => (
            <Link
              href={`/workspace/${firm.id}/dashboard`}
              key={firm.id}
              className="panel workspace-firm-card"
            >
              <span className="outline-badge">{firm.role}</span>
              <h2>{firm.name}</h2>
              <p>Open firm dashboard →</p>
            </Link>
          ))}
        </div>
      ) : (
        <section className="panel workspace-panel">
          <h2>No firm access yet</h2>
          <p>
            Your account is signed in but has no firm membership. Contact your
            administrator.
          </p>
        </section>
      )}
    </>
  );
}
