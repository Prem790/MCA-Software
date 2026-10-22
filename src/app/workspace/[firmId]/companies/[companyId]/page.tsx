import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { pageActor } from "@/platform/auth/page-session";
import { companies } from "@/platform/application/services";
import { getDatabase } from "@/platform/database/client";
import { ApplicationError } from "@/platform/http/errors";
import { canManageCompanies } from "@/modules/firms";
import { listAudit } from "@/modules/audit";
import { CompanyForm } from "@/features/workspace/company-form";
import { ArchiveCompany } from "@/features/workspace/archive-company";
import { Directors } from "@/features/workspace/directors";
export default async function CompanyDetail({
  params,
}: {
  params: Promise<{ firmId: string; companyId: string }>;
}) {
  const { firmId, companyId } = await params;
  const actor = await pageActor(firmId);
  if (!z.uuid().safeParse(companyId).success) notFound();
  const detail = await companies()
    .detail(actor, companyId)
    .catch((error) => {
      if (error instanceof ApplicationError && error.code === "NOT_FOUND")
        notFound();
      throw error;
    });
  const activity = await listAudit(getDatabase(), actor.firmId, companyId);
  const { company, directors } = detail;
  const canManage = canManageCompanies(actor.role);
  const writable = canManage && !company.archivedAt;
  return (
    <>
      <Link href={`/workspace/${firmId}/companies`} className="back-link">
        ← All companies
      </Link>
      <div className="page-heading">
        <div>
          <p className="eyebrow">
            {actor.firmName} · {actor.role}
          </p>
          <h1>{company.name}</h1>
          <p className="page-description">
            {company.companyType ?? "Company record"} ·{" "}
            {company.archivedAt ? "Archived" : "Active"}
          </p>
        </div>
        <span className="outline-badge">Saved company record</span>
      </div>
      {company.archivedAt && (
        <p className="workspace-readonly" role="status">
          This company is archived. Restore it before making changes.
        </p>
      )}
      <div className="workspace-detail-grid">
        <section className="panel workspace-panel">
          <h2>Company information</h2>
          {writable ? (
            <CompanyForm firmId={firmId} company={company} />
          ) : (
            <dl className="detail-fields">
              <div>
                <dt>Name</dt>
                <dd>{company.name}</dd>
              </div>
              <div>
                <dt>CIN</dt>
                <dd>{company.cin ?? "Not provided"}</dd>
              </div>
              <div>
                <dt>Contact email</dt>
                <dd>{company.contactEmail ?? "Not provided"}</dd>
              </div>
              <div>
                <dt>Address</dt>
                <dd>{company.address ?? "Not provided"}</dd>
              </div>
            </dl>
          )}
        </section>
        <section className="panel workspace-panel">
          <h2>Activity history</h2>
          <p className="workspace-note">Latest 50 changes to this company.</p>
          <ul className="workspace-activity">
            {activity.map((event) => (
              <li key={event.id}>
                <strong>
                  {event.action.replaceAll(".", " ").replaceAll("_", " ")}
                </strong>
                <span className="workspace-note">
                  {event.actorName ?? "System"}
                </span>
                <time dateTime={event.occurredAt.toISOString()}>
                  {new Intl.DateTimeFormat("en-GB", {
                    dateStyle: "medium",
                    timeStyle: "short",
                    timeZone: "Asia/Kolkata",
                  }).format(event.occurredAt)}{" "}
                  IST
                </time>
              </li>
            ))}
          </ul>
          {!activity.length && <p>No activity recorded yet.</p>}
        </section>
      </div>
      <section className="panel workspace-panel">
        <h2>Directors and officers</h2>
        <Directors
          firmId={firmId}
          companyId={companyId}
          directors={directors}
          writable={writable}
        />
      </section>
      {canManage && (
        <section className="panel workspace-panel">
          <h2>Company status</h2>
          <ArchiveCompany
            firmId={firmId}
            companyId={companyId}
            archived={!!company.archivedAt}
          />
        </section>
      )}
    </>
  );
}
