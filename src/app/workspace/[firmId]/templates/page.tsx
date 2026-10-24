import Link from "next/link";
import { pageActor } from "@/platform/auth/page-session";
import { compliance } from "@/platform/application/services";
import { obligationQuery } from "@/modules/compliance/contracts";
import { TemplateForm } from "@/features/workspace/template-form";
export default async function TemplatesPage({
  params,
  searchParams,
}: {
  params: Promise<{ firmId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { firmId } = await params;
  const actor = await pageActor(firmId);
  const parsed = obligationQuery.safeParse(await searchParams);
  if (!parsed.success)
    return (
      <section className="panel workspace-panel">
        <h1>Invalid page</h1>
        <Link href={`/workspace/${firmId}/templates`}>Return to templates</Link>
      </section>
    );
  const data = await compliance().templates(actor, parsed.data.page);
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">{actor.firmName}</p>
          <h1>Obligation templates</h1>
          <p className="page-description">
            Your firm's reusable work instructions. Applicability and due dates
            require user confirmation.
          </p>
        </div>
      </div>
      {actor.role !== "staff" && (
        <section className="panel workspace-panel">
          <h2>Create template</h2>
          <TemplateForm firmId={firmId} />
        </section>
      )}
      {data.items.map((template) => (
        <section key={template.id} className="panel workspace-panel">
          <h2>
            {template.name}
            {template.archivedAt ? " · archived" : ""}
          </h2>
          <p className="work-preserve">
            {template.description || "No instructions provided."}
          </p>
          {!template.archivedAt && actor.role !== "staff" && (
            <>
              <Link
                className="text-link"
                href={`/workspace/${firmId}/obligations/new?templateId=${template.id}`}
              >
                Use template
              </Link>
              <details className="workspace-add-director">
                <summary>Edit template</summary>
                <TemplateForm
                  key={template.version}
                  firmId={firmId}
                  template={template}
                />
              </details>
            </>
          )}
        </section>
      ))}
      {!data.items.length && (
        <section className="panel workspace-panel">
          <p>
            No templates yet. Custom obligations can be created without a
            template.
          </p>
        </section>
      )}
      <nav className="workspace-pagination" aria-label="Template pages">
        <span>
          Page {parsed.data.page} · {data.total} templates
        </span>
        {parsed.data.page > 1 && (
          <Link href={`?page=${parsed.data.page - 1}`}>Previous page</Link>
        )}
        {parsed.data.page * 20 < data.total && (
          <Link href={`?page=${parsed.data.page + 1}`}>Next page</Link>
        )}
      </nav>
    </>
  );
}
