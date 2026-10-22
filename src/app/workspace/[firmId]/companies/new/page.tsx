import Link from "next/link";
import { pageActor } from "@/platform/auth/page-session";
import { canManageCompanies } from "@/modules/firms";
import { CompanyForm } from "@/features/workspace/company-form";
export default async function NewCompany({
  params,
}: {
  params: Promise<{ firmId: string }>;
}) {
  const { firmId } = await params;
  const actor = await pageActor(firmId);
  return (
    <>
      <Link href={`/workspace/${firmId}/companies`} className="back-link">
        ← All companies
      </Link>
      <div className="page-heading">
        <div>
          <p className="eyebrow">{actor.firmName}</p>
          <h1>Add company</h1>
          <p className="page-description">
            Save a company record in this firm.
          </p>
        </div>
      </div>
      <section className="panel workspace-panel">
        {canManageCompanies(actor.role) ? (
          <CompanyForm firmId={firmId} />
        ) : (
          <p className="workspace-readonly">
            Your role has read-only access to company records.
          </p>
        )}
      </section>
    </>
  );
}
