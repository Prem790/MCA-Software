import Link from "next/link";
import { Button } from "@/components/ui/button";
import { pageActor, pageRecord } from "@/platform/auth/page-session";
import { reporting } from "@/platform/application/services";
import { workOptions } from "@/platform/application/work-options";
import { calendarQuery } from "@/modules/reporting/contracts";
import { monthDetails } from "@/modules/reporting/domain/calendar";
import { CompanyPicker } from "@/features/workspace/report-filters";
import { ReportTable } from "@/features/workspace/report-table";
export default async function CalendarPage({
  params,
  searchParams,
}: {
  params: Promise<{ firmId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { firmId } = await params;
  const actor = await pageActor(firmId);
  const path = `/workspace/${firmId}/calendar`;
  const parsed = calendarQuery.safeParse(await searchParams);
  if (!parsed.success)
    return (
      <section className="panel workspace-panel">
        <h1>Invalid calendar filters</h1>
        <Link href={path}>Reset calendar</Link>
      </section>
    );
  const query = parsed.data;
  const data = await reporting().calendar(actor, query);
  const options = await pageRecord(() => workOptions(actor, query.companyId));
  const range = monthDetails(data.month);
  const scope: Record<string, string> = {
    ...(query.companyId ? { companyId: query.companyId } : {}),
    archived: query.archived,
  };
  const link = (changes: Record<string, string>) =>
    `${path}?${new URLSearchParams({ ...scope, month: data.month, day: data.day, ...changes })}`;
  const tasks = new Map(data.tasksByDay.map((item) => [item.day, item.total]));
  const obligations = new Map(
    data.obligationsByDay.map((item) => [item.day, item.total]),
  );
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">{actor.firmName}</p>
          <h1>Deadline calendar</h1>
          <p className="page-description">
            Task due dates and user-confirmed obligation dates. All task
            statuses are included.
          </p>
        </div>
      </div>
      <section className="panel workspace-panel">
        <form className="workspace-form" action={path}>
          <div className="report-filter-grid">
            <CompanyPicker
              companies={options.companies}
              selected={query.companyId}
            />
            <label className="field-label">
              Month
              <input
                name="month"
                type="month"
                defaultValue={data.month}
                required
                min="2000-01"
                max="2199-12"
              />
            </label>
            <label className="field-label">
              Companies
              <select name="archived" defaultValue={query.archived}>
                <option value="active">Active companies</option>
                <option value="all">Include archived</option>
              </select>
            </label>
          </div>
          <Button type="submit">Show month</Button>
        </form>
        <nav className="workspace-pagination" aria-label="Calendar months">
          {range.previous && (
            <Link
              href={link({
                month: range.previous,
                day: range.previous + "-01",
              })}
            >
              Previous month
            </Link>
          )}
          <strong>{data.month}</strong>
          {range.next && (
            <Link href={link({ month: range.next, day: range.next + "-01" })}>
              Next month
            </Link>
          )}
          <Link href={path}>Current month</Link>
        </nav>
        <div className="calendar-weekdays" aria-hidden="true">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
            <span key={day}>{day}</span>
          ))}
        </div>
        <ol
          className="deadline-calendar"
          aria-label={`Deadline counts for ${data.month}`}
        >
          {range.days.map((day, index) => (
            <li
              key={day}
              style={
                index === 0 ? { gridColumnStart: range.offset + 1 } : undefined
              }
            >
              <Link
                href={link({ day })}
                aria-current={day === data.day ? "date" : undefined}
                aria-label={`${day}: ${tasks.get(day) ?? 0} tasks, ${obligations.get(day) ?? 0} obligations`}
              >
                <strong>{Number(day.slice(8))}</strong>
                <span>{tasks.get(day) ?? 0} tasks</span>
                <span>{obligations.get(day) ?? 0} obligations</span>
              </Link>
            </li>
          ))}
        </ol>
        <p className="workspace-note">
          One obligation and its linked tasks can appear separately. Counts
          represent records, not distinct filings. Unconfirmed obligation dates
          are excluded.
        </p>
      </section>
      <section className="panel workspace-panel">
        <h2>
          Tasks due {data.day} · {data.taskTotal}
        </h2>
        <ReportTable firmId={firmId} kind="tasks" items={data.tasks} />
        <nav className="workspace-pagination" aria-label="Calendar task pages">
          <span>Page {query.taskPage}</span>
          {query.taskPage > 1 && (
            <Link
              href={link({
                taskPage: String(query.taskPage - 1),
                obligationPage: String(query.obligationPage),
              })}
            >
              Previous
            </Link>
          )}
          {query.taskPage * 20 < data.taskTotal && (
            <Link
              href={link({
                taskPage: String(query.taskPage + 1),
                obligationPage: String(query.obligationPage),
              })}
            >
              Next
            </Link>
          )}
        </nav>
      </section>
      <section className="panel workspace-panel">
        <h2>
          Confirmed obligations due {data.day} · {data.obligationTotal}
        </h2>
        <ReportTable
          firmId={firmId}
          kind="obligations"
          items={data.obligations}
        />
        <nav
          className="workspace-pagination"
          aria-label="Calendar obligation pages"
        >
          <span>Page {query.obligationPage}</span>
          {query.obligationPage > 1 && (
            <Link
              href={link({
                obligationPage: String(query.obligationPage - 1),
                taskPage: String(query.taskPage),
              })}
            >
              Previous
            </Link>
          )}
          {query.obligationPage * 20 < data.obligationTotal && (
            <Link
              href={link({
                obligationPage: String(query.obligationPage + 1),
                taskPage: String(query.taskPage),
              })}
            >
              Next
            </Link>
          )}
        </nav>
      </section>
    </>
  );
}
