import Link from "next/link";
import { readRuntimeConfig } from "@/platform/configuration/env";
import { pageSession } from "@/platform/auth/page-session";
import { firms } from "@/platform/application/services";
export default async function WorkspaceHome() {
  if (readRuntimeConfig().APP_MODE !== "application")
    return (
      <section className="panel workspace-panel">
        <p className="eyebrow">PHASE 2 · SETUP</p>
        <h1>Connect your development workspace</h1>
        <p>
          The working application needs PostgreSQL and an administrator account.
          The fictional preview is available without either.
        </p>
        <ol className="setup-steps">
          <li>
            Configure your development database and auth secret in the local
            environment.
          </li>
          <li>Run the database migrations.</li>
          <li>
            Use the account provisioning command to create your firm
            administrator.
          </li>
          <li>Enable application mode and restart the server.</li>
        </ol>
        <p>
          See the repository README for commands. Keep passwords and connection
          strings out of source control.
        </p>
        <Link href="/preview" className="text-link">
          Open fictional preview
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
              href={`/workspace/${firm.id}/companies`}
              key={firm.id}
              className="panel workspace-firm-card"
            >
              <span className="outline-badge">{firm.role}</span>
              <h2>{firm.name}</h2>
              <p>Open company records →</p>
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
