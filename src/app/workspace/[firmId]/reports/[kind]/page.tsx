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
      <section className="panel workspace-panel">
        <h1>Invalid report filters</h1>
        <p>Check the date range and selected values.</p>
        <Link href={path}>Clear filters</Link>
      </section>
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
      <section className="panel workspace-panel">
        <h1>Task filters do not apply to obligations</h1>
        <Link href={path}>Clear filters</Link>
      </section>
    );
  const data = await reporting().report(actor, kind, query);
  const options = await pageRecord(() => workOptions(actor, query.companyId));
  const encoded = new URLSearchParams();
  for (const [key, value] of Object.entries(query))
    if (value !== undefined && key !== "page") encoded.set(key, String(value));
  const pageLink = (page: number) => `${path}?${encoded}&page=${page}`;
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
        <Link href={`/workspace/${firmId}/reports/tasks`}>Task reports</Link>
        <Link href={`/workspace/${firmId}/reports/obligations`}>
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
          {data.total} matching {kind}. CSV exports include every matching row
          up to 1,000, independent of the page shown.
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
        <nav className="workspace-pagination" aria-label="Report pages">
          <span>Page {query.page} · 20 per page</span>
          {query.page > 1 && (
            <Link href={pageLink(query.page - 1)}>Previous</Link>
          )}
          {query.page * 20 < data.total && (
            <Link href={pageLink(query.page + 1)}>Next</Link>
          )}
        </nav>
      </section>
    </>
  );
}
