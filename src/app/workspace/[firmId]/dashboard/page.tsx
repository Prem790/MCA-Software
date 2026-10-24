import Link from "next/link";
import { Button } from "@/components/ui/button";
import { pageActor, pageRecord } from "@/platform/auth/page-session";
import { reporting } from "@/platform/application/services";
import { workOptions } from "@/platform/application/work-options";
import { dashboardQuery } from "@/modules/reporting/contracts";
import { ReportTable } from "@/features/workspace/report-table";
import { ReportRefresh } from "@/features/workspace/report-export";
import { CompanyPicker } from "@/features/workspace/report-filters";
export default async function DashboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ firmId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { firmId } = await params;
  const actor = await pageActor(firmId);
  const parsed = dashboardQuery.safeParse(await searchParams);
  const path = `/workspace/${firmId}/dashboard`;
  if (!parsed.success)
    return (
      <section className="panel workspace-panel">
        <h1>Invalid dashboard filters</h1>
        <Link href={path}>Clear filters</Link>
      </section>
    );
  const query = parsed.data;
  const data = await reporting().dashboard(actor, query);
  const options = await pageRecord(() => workOptions(actor, query.companyId));
  const scope: Record<string, string> = query.companyId
    ? { companyId: query.companyId }
    : {};
  const reportLink = (filters: Record<string, string>) =>
    `/workspace/${firmId}/reports/tasks?${new URLSearchParams({ ...scope, ...filters })}`;
  const cards: {
    label: string;
    value: number;
    filters: Record<string, string>;
  }[] = [
    { label: "All tasks", value: data.counts.total, filters: {} },
    {
      label: "Overdue unfinished",
      value: data.counts.overdue,
      filters: { due: "overdue" },
    },
    {
      label: "Due today through next 7 days",
      value: data.counts.upcoming,
      filters: { due: "upcoming" },
    },
    {
      label: "Submitted for review",
      value: data.counts.pendingReview,
      filters: { status: "submitted_for_review" },
    },
    {
      label: "Changes requested",
      value: data.counts.changesRequested,
      filters: { status: "changes_requested" },
    },
    {
      label: "Approved, awaiting completion",
      value: data.counts.approved,
      filters: { status: "approved" },
    },
    {
      label: "Waiting for documents",
      value: data.counts.waitingDocuments,
      filters: { status: "waiting_for_documents" },
    },
    {
      label: "Completed (all time)",
      value: data.counts.completed,
      filters: { status: "completed" },
    },
    {
      label: "Pending my review",
      value: data.counts.myReviews,
      filters: { reviewer: "me" },
    },
  ];
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">{actor.firmName}</p>
          <h1>Dashboard</h1>
          <p className="page-description">
            As of {data.today} IST · active companies only · refresh to see new
            changes.
          </p>
        </div>
        <ReportRefresh />
      </div>
      <section className="panel workspace-panel">
        <form className="workspace-form" action={path}>
          <CompanyPicker
            companies={options.companies}
            selected={query.companyId}
          />
          <Button type="submit">Apply company</Button>
        </form>
      </section>
      <div className="report-summary-grid">
        {cards.map((card) => (
          <Link
            className="panel report-metric"
            key={card.label}
            href={reportLink(card.filters)}
          >
            <span>{card.label}</span>
            <strong>{card.value}</strong>
          </Link>
        ))}
      </div>
      <p>
        {data.counts.open} unfinished tasks · {data.counts.mine} assigned to
        you. Completed counts cover all saved tasks in the selected scope.
      </p>
      <section className="panel workspace-panel">
        <h2>Obligation overview</h2>
        <p>
          {data.obligations.total} obligations · {data.obligations.upcoming}{" "}
          confirmed dates today through next 7 days ·{" "}
          {data.obligations.unconfirmed} needing date confirmation.
        </p>
        <Link
          href={`/workspace/${firmId}/reports/obligations?${new URLSearchParams(scope)}`}
        >
          View obligation report
        </Link>
        <p className="workspace-note">
          Task and obligation dates are distinct. Dates are entered by your team
          and do not establish filing compliance.
        </p>
      </section>
      <section className="panel workspace-panel">
        <h2>Pending your review</h2>
        <p className="workspace-note">First 10, ordered by task due date.</p>
        <ReportTable firmId={firmId} kind="tasks" items={data.reviewQueue} />
        <Link href={reportLink({ reviewer: "me" })}>
          View your full review queue
        </Link>
      </section>
      <section className="panel workspace-panel">
        <h2>Upcoming unfinished tasks</h2>
        <p className="workspace-note">First 10, today through next 7 days.</p>
        <ReportTable firmId={firmId} kind="tasks" items={data.upcoming} />
        <Link href={reportLink({ due: "upcoming" })}>
          View all upcoming tasks
        </Link>
      </section>
      <section className="panel workspace-panel">
        <h2>Workload by assignee</h2>
        <p className="workspace-note">
          Assignees with saved tasks, including unassigned work and members
          whose access was removed. Ordered by overdue then unfinished count.
        </p>
        {data.workload.length ? (
          <div className="table-scroll">
            <table className="data-table">
              <caption className="sr-only">Workload by assignee</caption>
              <thead>
                <tr>
                  <th scope="col">Assignee</th>
                  <th scope="col">Unfinished</th>
                  <th scope="col">Overdue</th>
                  <th scope="col">In review</th>
                  <th scope="col">Completed</th>
                </tr>
              </thead>
              <tbody>
                {data.workload.map((row) => (
                  <tr key={row.assigneeId ?? "unassigned"}>
                    <td>
                      <Link
                        href={reportLink({
                          assigneeId: row.assigneeId ?? "unassigned",
                        })}
                      >
                        {row.name ?? "Unassigned"}
                        {row.revokedAt ? " (access removed)" : ""}
                      </Link>
                    </td>
                    <td>{row.open}</td>
                    <td>{row.overdue}</td>
                    <td>{row.pendingReview}</td>
                    <td>{row.completed}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p>No assigned work yet.</p>
        )}
        <nav className="workspace-pagination" aria-label="Workload pages">
          <span>
            Page {query.page} · {data.workloadTotal} groups
          </span>
          {query.page > 1 && (
            <Link
              href={`${path}?${new URLSearchParams({ ...scope, page: String(query.page - 1) })}`}
            >
              Previous
            </Link>
          )}
          {query.page * 20 < data.workloadTotal && (
            <Link
              href={`${path}?${new URLSearchParams({ ...scope, page: String(query.page + 1) })}`}
            >
              Next
            </Link>
          )}
        </nav>
      </section>
    </>
  );
}
