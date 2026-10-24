import { EdgeState } from "@/features/workspace/edge-state";
import { DateLabel, DataPagination } from "@/features/workspace/data-views";
import { displayDate, displayMonth } from "@/features/workspace/data-display";
import { indiaToday } from "@/lib/work-dates";
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
      <EdgeState
        title="Invalid calendar filters"
        action={
          <Link href={path} className="form-cancel">
            Reset calendar
          </Link>
        }
      >
        Choose a supported month and company, then try again.
      </EdgeState>
    );
  const query = parsed.data;
  const data = await reporting().calendar(actor, query);
  const options = await pageRecord(() => workOptions(actor, query.companyId));
  const range = monthDetails(data.month);
  const today = indiaToday();
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
      <section className="panel workspace-panel calendar-panel">
        <form className="workspace-form calendar-filter-form" action={path}>
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
          <h2>{displayMonth(data.month)}</h2>
          {range.next && (
            <Link href={link({ month: range.next, day: range.next + "-01" })}>
              Next month
            </Link>
          )}
          <Link href={`${path}?${new URLSearchParams(scope)}`}>
            Current month
          </Link>
        </nav>
        <div
          className="calendar-legend"
          role="group"
          aria-label="Calendar legend"
        >
          <span>
            <i className="calendar-dot task-dot" aria-hidden="true" />
            Tasks
          </span>
          <span>
            <i className="calendar-dot obligation-dot" aria-hidden="true" />
            Confirmed obligations
          </span>
          <span>Outlined date: selected · Filled day number: today</span>
        </div>
        <div className="calendar-weekdays" aria-hidden="true">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
            <span key={day}>{day}</span>
          ))}
        </div>
        <ol
          className="deadline-calendar"
          aria-label={`Deadline counts for ${displayMonth(data.month)}`}
        >
          {range.days.map((day, index) => (
            <li
              key={day}
              style={
                index === 0 ? { gridColumnStart: range.offset + 1 } : undefined
              }
            >
              <Link
                href={`${link({ day })}#day-agenda`}
                data-today={day === today}
                aria-current={day === data.day ? "date" : undefined}
                aria-label={`${displayDate(day)}${day === today ? ", today" : ""}: ${tasks.get(day) ?? 0} ${tasks.get(day) === 1 ? "task" : "tasks"}, ${obligations.get(day) ?? 0} confirmed ${obligations.get(day) === 1 ? "obligation" : "obligations"}`}
              >
                <strong className="calendar-day-number">
                  {Number(day.slice(8))}
                </strong>
                {!!tasks.get(day) && (
                  <span className="calendar-count" aria-hidden="true">
                    <i className="calendar-dot task-dot" />
                    {tasks.get(day)}
                    <span className="calendar-count-label"> tasks</span>
                  </span>
                )}
                {!!obligations.get(day) && (
                  <span className="calendar-count" aria-hidden="true">
                    <i className="calendar-dot obligation-dot" />
                    {obligations.get(day)}
                    <span className="calendar-count-label"> obligations</span>
                  </span>
                )}
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
      <section className="panel workspace-panel" id="day-agenda" tabIndex={-1}>
        <h2>
          Tasks due <DateLabel value={data.day} /> · {data.taskTotal}
        </h2>
        <ReportTable
          firmId={firmId}
          kind="tasks"
          items={data.tasks}
          emptyTitle="No tasks due on this day"
          emptyDescription="Select another date to see its saved task deadlines."
        />
        <DataPagination
          label="Calendar task pages"
          total={data.taskTotal}
          page={query.taskPage}
          count={data.tasks.length}
          pageLink={(page) =>
            link({
              taskPage: String(page),
              obligationPage: String(query.obligationPage),
            })
          }
        />
      </section>
      <section className="panel workspace-panel">
        <h2>
          Confirmed obligations due <DateLabel value={data.day} /> ·{" "}
          {data.obligationTotal}
        </h2>
        <ReportTable
          firmId={firmId}
          kind="obligations"
          items={data.obligations}
          emptyTitle="No confirmed obligations due on this day"
          emptyDescription="Only obligations with user-confirmed dates appear in the calendar."
        />
        <DataPagination
          label="Calendar obligation pages"
          total={data.obligationTotal}
          page={query.obligationPage}
          count={data.obligations.length}
          pageLink={(page) =>
            link({
              obligationPage: String(page),
              taskPage: String(query.taskPage),
            })
          }
        />
      </section>
    </>
  );
}
