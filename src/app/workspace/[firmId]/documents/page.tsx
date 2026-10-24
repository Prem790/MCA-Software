import { EdgeState } from "@/features/workspace/edge-state";
import { Button } from "@/components/ui/button";
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
        {!!options.companies.length && (
          <form
            className="workspace-form workflow-form document-company-picker"
            action={`/workspace/${firmId}/documents`}
          >
            <label className="field-label">
              Company
              <select name="companyId" required defaultValue="">
                <option value="" disabled>
                  Choose a company
                </option>
                {options.companies.map((company) => (
                  <option value={company.id} key={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
            </label>
            <Button type="submit">Open documents</Button>
          </form>
        )}

        {!options.companies.length && (
          <p>
            No active companies yet.{" "}
            <Link className="text-link" href={`/workspace/${firmId}/companies`}>
              Open Companies
            </Link>{" "}
            to view available company records.
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
      <EdgeState
        title="Invalid document filters"
        action={
          <Link className="form-cancel" href={`/workspace/${firmId}/documents`}>
            Choose a company
          </Link>
        }
      >
        Choose a company again to view its documents.
      </EdgeState>
    );
  const input = parsed.data;
  const detail = await pageRecord(() =>
    companies().detail(actor, input.companyId),
  );
  const linked = input.taskId
    ? await pageRecord(() => tasks().detail(actor, input.taskId!))
    : undefined;
  if (linked && linked.task.companyId !== input.companyId)
    return (
      <EdgeState
        title="Task unavailable in this company"
        action={
          <Link
            className="form-cancel"
            href={`/workspace/${firmId}/documents?companyId=${input.companyId}`}
          >
            Open company documents
          </Link>
        }
      >
        This task does not belong to the selected company. Choose a task from
        that company's records.
      </EdgeState>
    );
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
        className="text-link"
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
          Private uploads are not available yet. Contact your firm administrator
          to enable document storage.
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
