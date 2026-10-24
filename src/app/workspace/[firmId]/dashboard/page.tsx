import { EdgeState } from "@/features/workspace/edge-state";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import {
  DataPagination,
  DateLabel,
  EmptyRecords,
  RecordLink,
} from "@/features/workspace/data-views";
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
      <EdgeState
        title="Invalid dashboard filters"
        action={
          <Link href={path} className="form-cancel">
            Clear filters
          </Link>
        }
      >
        Check the company selection and page number.
      </EdgeState>
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
    primary?: boolean;
  }[] = [
    {
      label: "All tasks",
      value: data.counts.total,
      filters: {},
      primary: true,
    },
    {
      label: "Overdue tasks",
      primary: true,
      value: data.counts.overdue,
      filters: { due: "overdue" },
    },
    {
      label: "Due today + 7 days",
      primary: true,
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
      label: "Approved",
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
      primary: true,
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
            <DateLabel value={data.today} /> · India time · active companies
            only
          </p>
        </div>
        <ReportRefresh />
      </div>
      <section className="dashboard-scope" aria-label="Dashboard scope">
        <form className="dashboard-scope-form" action={path}>
          <CompanyPicker
            companies={options.companies}
            selected={query.companyId}
          />
          <Button type="submit">Apply company</Button>
          {query.companyId && (
            <Link className="text-link" href={path}>
              All companies
            </Link>
          )}
        </form>
        <p className="workspace-note">
          Showing{" "}
          {query.companyId
            ? (options.companies.find(
                (company) => company.id === query.companyId,
              )?.name ?? "selected company")
            : "all active companies"}
          . Refresh for the latest saved changes.
        </p>
      </section>
      {data.counts.total === 0 && data.obligations.total === 0 && (
        <section className="dashboard-onboarding">
          <EmptyRecords
            title={
              options.companies.length
                ? "Nothing scheduled in this view"
                : actor.role === "staff"
                  ? "No active company records"
                  : "Start with an active company"
            }
            action={
              actor.role !== "staff" ? (
                <Button asChild>
                  <Link
                    href={
                      options.companies.length
                        ? `/workspace/${firmId}/obligations/new`
                        : `/workspace/${firmId}/companies/new`
                    }
                  >
                    {options.companies.length
                      ? "New obligation"
                      : "Add company"}
                  </Link>
                </Button>
              ) : undefined
            }
          >
            {actor.role === "staff"
              ? "Your team’s saved work will appear here. Ask your manager about upcoming assignments."
              : options.companies.length
                ? "Add an obligation, then create and assign its tasks to start tracking progress."
                : "Add a company to organize its obligations, tasks and private documents."}
          </EmptyRecords>
        </section>
      )}
      <section
        className="dashboard-overview"
        aria-labelledby="task-overview-title"
      >
        <h2 id="task-overview-title" className="data-section-title">
          Task overview
        </h2>
        <div className="dashboard-metrics">
          {cards
            .filter((card) => card.primary)
            .map((card) => (
              <Link
                className="dashboard-metric"
                key={card.label}
                href={reportLink(card.filters)}
              >
                <span>
                  {card.label}
                  {card.filters.due === "overdue" && (
                    <small className="data-muted metric-note">
                      Unfinished only
                    </small>
                  )}
                </span>
                <strong>{card.value}</strong>
                <span className="metric-action">
                  View tasks <ArrowRight size={15} aria-hidden="true" />
                </span>
              </Link>
            ))}
        </div>
        <p className="dashboard-summary">
          {data.counts.open} unfinished tasks · {data.counts.mine} assigned to
          you. Upcoming includes today and the next 7 days.
        </p>
        <details className="dashboard-workflow" open={data.counts.total > 0}>
          <summary>
            Review and progress <span>5 workflow counts</span>
          </summary>
          <div className="dashboard-workflow-grid">
            {cards
              .filter((card) => !card.primary)
              .map((card) => (
                <Link key={card.label} href={reportLink(card.filters)}>
                  <span>
                    {card.label}
                    {card.label === "Approved" && (
                      <small>Awaiting completion</small>
                    )}
                  </span>
                  <strong>{card.value}</strong>
                  <ArrowRight size={15} aria-hidden="true" />
                </Link>
              ))}
          </div>
          <p className="workspace-note">
            Completed counts cover all saved tasks in this scope, across all
            time.
          </p>
        </details>
      </section>
      <section className="panel workspace-panel">
        <h2>Obligation overview</h2>
        <p>
          <strong>{data.obligations.total}</strong> obligations ·{" "}
          <strong>{data.obligations.upcoming}</strong> confirmed dates today
          through next 7 days · <strong>{data.obligations.unconfirmed}</strong>{" "}
          needing date confirmation.
        </p>
        <Link
          className="text-link"
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
        <ReportTable
          firmId={firmId}
          kind="tasks"
          items={data.reviewQueue}
          emptyTitle="No reviews waiting for you"
          emptyDescription="Tasks awaiting your review will appear here when assigned to you."
        />
        <Link className="text-link" href={reportLink({ reviewer: "me" })}>
          View your full review queue
        </Link>
      </section>
      <section className="panel workspace-panel">
        <h2>Upcoming unfinished tasks</h2>
        <p className="workspace-note">First 10, today through next 7 days.</p>
        <ReportTable
          firmId={firmId}
          kind="tasks"
          items={data.upcoming}
          emptyTitle="No upcoming unfinished tasks"
          emptyDescription="There are no matching unfinished tasks due today through the next 7 days."
        />
        <Link className="text-link" href={reportLink({ due: "upcoming" })}>
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
          <div
            className="table-scroll"
            role="region"
            aria-label="Workload table"
            tabIndex={0}
          >
            <table className="data-table workspace-data-table">
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
                      <RecordLink
                        href={reportLink({
                          assigneeId: row.assigneeId ?? "unassigned",
                        })}
                      >
                        {row.name ?? "Unassigned"}
                        {row.revokedAt ? " (access removed)" : ""}
                      </RecordLink>
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
        <DataPagination
          label="Workload pages"
          total={data.workloadTotal}
          page={query.page}
          count={data.workload.length}
          pageLink={(page) =>
            `${path}?${new URLSearchParams({ ...scope, page: String(page) })}`
          }
        />
      </section>
    </>
  );
}
