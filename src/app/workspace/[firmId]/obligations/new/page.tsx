import Link from "next/link";
import {
  pageActor,
  pageRecord,
  pageResourceId,
} from "@/platform/auth/page-session";
import { compliance, companies, tasks } from "@/platform/application/services";
import { ObligationForm } from "@/features/workspace/obligation-form";
export default async function NewObligation({
  params,
  searchParams,
}: {
  params: Promise<{ firmId: string }>;
  searchParams: Promise<{ companyId?: string; templateId?: string }>;
}) {
  const { firmId } = await params;
  const actor = await pageActor(firmId);
  if (actor.role === "staff")
    return (
      <section className="panel workspace-panel">
        <h1>Manager access required</h1>
        <p>Admins and managers create obligations.</p>
      </section>
    );
  const query = await searchParams;
  const company = query.companyId
    ? (
        await pageRecord(() =>
          companies().detail(actor, pageResourceId(query.companyId!)),
        )
      ).company
    : undefined;
  if (company?.archivedAt)
    return (
      <section className="panel workspace-panel">
        <h1>Company archived</h1>
        <p>Restore the company before adding obligations.</p>
      </section>
    );
  const selectedTemplate = query.templateId
    ? await pageRecord(() =>
        compliance().template(actor, pageResourceId(query.templateId!)),
      )
    : undefined;
  const options = await tasks().options(actor);
  const templates = (await compliance().templates(actor, 1)).items.filter(
    (template) => !template.archivedAt,
  );
  return (
    <>
      <Link className="back-link" href={`/workspace/${firmId}/obligations`}>
        ← Obligations
      </Link>
      <section className="panel workspace-panel">
        <h1>New obligation{company ? ` · ${company.name}` : ""}</h1>
        <ObligationForm
          firmId={firmId}
          options={options}
          templates={templates}
          companyId={company?.id}
          selectedTemplate={selectedTemplate}
        />
      </section>
    </>
  );
}
