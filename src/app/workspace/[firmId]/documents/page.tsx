import Link from "next/link";
import { pageActor, pageRecord } from "@/platform/auth/page-session";
import { companies, documents, tasks } from "@/platform/application/services";
import { documentQuery } from "@/modules/documents/contracts";
import { isEditableWork, mayWorkOnTask } from "@/modules/tasks";
import { DocumentList } from "@/features/workspace/document-list";
import { DocumentUpload } from "@/features/workspace/document-upload";
import { readStorageConfig } from "@/platform/storage/configuration";
export default async function DocumentsPage({
  params,
  searchParams,
}: {
  params: Promise<{ firmId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { firmId } = await params;
  const actor = await pageActor(firmId);
  const query = await searchParams;
  if (!query.companyId) {
    const options = await tasks().options(actor);
    return (
      <section className="panel workspace-panel">
        <h1>Private documents</h1>
        <p>
          Select an active company. Archived companies' files remain accessible
          through their company records.
        </p>
        <ul>
          {options.companies.map((company) => (
            <li key={company.id}>
              <Link href={`?companyId=${company.id}`}>{company.name}</Link>
            </li>
          ))}
        </ul>
        {!options.companies.length && (
          <p>
            No active companies yet.{" "}
            <Link href={`/workspace/${firmId}/companies`}>Open Companies</Link>{" "}
            to create or restore one.
          </p>
        )}
        {options.limited && (
          <p>
            Showing the first 200 companies. Open another company from the
            Companies list to access its documents.
          </p>
        )}
      </section>
    );
  }
  const parsed = documentQuery.safeParse(query);
  if (!parsed.success)
    return (
      <p>
        Invalid document filters.{" "}
        <Link href={`/workspace/${firmId}/documents`}>Choose a company</Link>
      </p>
    );
  const input = parsed.data;
  const detail = await pageRecord(() =>
    companies().detail(actor, input.companyId),
  );
  const linked = input.taskId
    ? await pageRecord(() => tasks().detail(actor, input.taskId!))
    : undefined;
  if (linked && linked.task.companyId !== input.companyId)
    return <p>Task was not found in this company.</p>;
  const files = await documents().list(actor, input);
  const writable =
    !detail.company.archivedAt &&
    (linked
      ? isEditableWork(linked.task.status) &&
        mayWorkOnTask(actor.role, actor.userId, linked.task.assigneeId)
      : actor.role !== "staff");
  const enabled = readStorageConfig().enabled;
  const url = `/workspace/${firmId}/documents?companyId=${input.companyId}${input.taskId ? `&taskId=${input.taskId}` : ""}`;
  return (
    <section className="panel workspace-panel">
      <h1>
        {detail.company.name} ·{" "}
        {linked ? "Task documents" : "Company documents"}
      </h1>
      <Link
        href={
          linked
            ? `/workspace/${firmId}/tasks/${linked.task.id}`
            : `/workspace/${firmId}/companies/${input.companyId}`
        }
      >
        Back to {linked ? "task" : "company"}
      </Link>
      <DocumentList firmId={firmId} items={files} />
      <nav className="workspace-pagination" aria-label="Document pages">
        <span>Page {input.page} · 20 per page</span>
        {input.page > 1 && (
          <Link href={`${url}&page=${input.page - 1}`}>Previous</Link>
        )}
        {files.length === 20 && (
          <Link href={`${url}&page=${input.page + 1}`}>Next</Link>
        )}
      </nav>
      {writable && enabled && (
        <DocumentUpload
          key={linked?.task.version ?? input.companyId}
          firmId={firmId}
          companyId={input.companyId}
          taskId={input.taskId}
          version={linked?.task.version}
        />
      )}
      {!enabled && (
        <p>
          Private storage is not configured yet. An operator must connect a
          private Vercel Blob store.
        </p>
      )}
      {!writable && (
        <p>
          Uploads are read-only for your role or this record's current status.
        </p>
      )}
    </section>
  );
}
