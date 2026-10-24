import { EdgeState } from "@/features/workspace/edge-state";
import { DataPagination } from "@/features/workspace/data-views";
import Link from "next/link";
import { notFound } from "next/navigation";
import { pageActor, pageRecord } from "@/platform/auth/page-session";
import { reporting } from "@/platform/application/services";
import { workOptions } from "@/platform/application/work-options";
import { reportKind, reportQuery } from "@/modules/reporting/contracts";
import { ReportFilters } from "@/features/workspace/report-filters";
import { ReportTable } from "@/features/workspace/report-table";
import { ReportExport } from "@/features/workspace/report-export";
export default async function ReportsPage({
  params,
  searchParams,
}: {
  params: Promise<{ firmId: string; kind: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { firmId, kind: value } = await params;
  const actor = await pageActor(firmId);
  const selected = reportKind.safeParse(value);
  if (!selected.success) notFound();
  const kind = selected.data;
  const path = `/workspace/${firmId}/reports/${kind}`;
  const parsed = reportQuery.safeParse(await searchParams);
  if (!parsed.success)
    return (
      <EdgeState
        title="Invalid report filters"
        action={
          <Link href={path} className="form-cancel">
            Clear filters
          </Link>
        }
      >
        Check the date range and selected values.
      </EdgeState>
    );
  const query = parsed.data;
  if (
    kind === "obligations" &&
    (query.status !== "all" ||
      query.priority !== "all" ||
      query.assigneeId ||
      query.obligationId ||
      query.reviewer !== "all")
  )
    return (
      <EdgeState
        title="Task filters do not apply to obligations"
        action={
          <Link href={path} className="form-cancel">
            Clear filters
          </Link>
        }
      >
        Choose compatible obligation filters to continue.
      </EdgeState>
    );
  const data = await reporting().report(actor, kind, query);
  const options = await pageRecord(() => workOptions(actor, query.companyId));
  const encoded = new URLSearchParams();
  for (const [key, value] of Object.entries(query))
    if (value !== undefined && key !== "page") encoded.set(key, String(value));
  const pageLink = (page: number) => `${path}?${encoded}&page=${page}`;
  const commonScope = new URLSearchParams();
  for (const key of [
    "q",
    "companyId",
    "archived",
    "due",
    "dateFrom",
    "dateTo",
  ] as const) {
    const value = query[key];
    if (value !== undefined) commonScope.set(key, value);
  }
  const typeLink = (target: "tasks" | "obligations") =>
    `/workspace/${firmId}/reports/${target}?${target === kind ? encoded : commonScope}`;
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">{actor.firmName}</p>
          <h1>{kind === "tasks" ? "Task reports" : "Obligation reports"}</h1>
          <p className="page-description">
            Live saved records · due dates in Asia/Kolkata.
          </p>
        </div>
      </div>
      <nav
        className="workspace-actions work-record-links"
        aria-label="Report types"
      >
        <Link
          aria-current={kind === "tasks" ? "page" : undefined}
          href={typeLink("tasks")}
        >
          Task reports
        </Link>
        <Link
          aria-current={kind === "obligations" ? "page" : undefined}
          href={typeLink("obligations")}
        >
          Obligation reports
        </Link>
      </nav>
      <section className="panel workspace-panel">
        <ReportFilters
          path={path}
          query={query}
          options={options}
          kind={kind}
        />
      </section>
      <section className="panel workspace-panel">
        <p>
          {data.total} matching{" "}
          {data.total === 1 ? (kind === "tasks" ? "task" : "obligation") : kind}
          . CSV exports include all matching rows, independent of this page.
          Narrow filters if the result exceeds 1,000 rows or 3 MB.
        </p>
        {kind === "obligations" && (
          <p className="workspace-note">
            Past dates do not establish a missed filing. Obligations have no
            independent completed status; completion is tracked on tasks.
          </p>
        )}
        {actor.role !== "staff" ? (
          <ReportExport
            url={`/api/firms/${firmId}/reports/${kind}/export?${encoded}`}
            filename={`mca-${kind}.csv`}
          />
        ) : (
          <p className="workspace-note">
            CSV downloads are available to admins and managers.
          </p>
        )}
        <ReportTable firmId={firmId} kind={kind} items={data.items} />
        <DataPagination
          label="Report pages"
          total={data.total}
          page={query.page}
          count={data.items.length}
          pageLink={pageLink}
        />
      </section>
    </>
  );
}
