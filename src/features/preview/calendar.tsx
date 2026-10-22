import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeading, Panel } from "./components";
import { calendarMonth, type SearchParams } from "./selectors";
import { previewDate, previewMonth } from "./data";

export function CalendarView({ params }: { params: SearchParams }) {
  const month = calendarMonth(params.month);
  const rows = Array.from({ length: 6 }, (_, index) =>
    month.cells.slice(index * 7, index * 7 + 7),
  );
  return (
    <>
      <PageHeading
        eyebrow="PLAN AHEAD"
        title="Compliance calendar"
        description="See how your sample deadlines fit together, one month at a time."
        action={
          <Button asChild variant="outline">
            <Link href="/preview/compliance">List view</Link>
          </Button>
        }
      />
      <Panel>
        <div className="calendar-toolbar">
          <div>
            <h2>{month.label}</h2>
            <p>Illustrative dates · Not statutory deadlines</p>
          </div>
          <div className="calendar-controls">
            <Button asChild size="sm" variant="outline">
              <Link href={`/preview/calendar?month=${previewMonth}`}>
                Sample month
              </Link>
            </Button>
            <Link
              className="icon-button"
              href={`/preview/calendar?month=${month.previous}`}
              aria-label="Previous month"
            >
              <ChevronLeft size={18} />
            </Link>
            <Link
              className="icon-button"
              href={`/preview/calendar?month=${month.next}`}
              aria-label="Next month"
            >
              <ChevronRight size={18} />
            </Link>
          </div>
        </div>
        <div
          className="calendar-scroll"
          role="region"
          aria-label="Monthly sample calendar"
        >
          <table className="calendar-table">
            <caption className="sr-only">
              Sample assignment deadlines for {month.label}
            </caption>
            <thead>
              <tr>
                {[
                  "Monday",
                  "Tuesday",
                  "Wednesday",
                  "Thursday",
                  "Friday",
                  "Saturday",
                  "Sunday",
                ].map((day) => (
                  <th key={day} scope="col">
                    {day.slice(0, 3)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={index}>
                  {row.map((cell) => (
                    <td
                      key={cell.date}
                      className={`${!cell.inMonth ? "outside-month" : ""} ${cell.date === previewDate ? "sample-day" : ""}`}
                    >
                      <span className="calendar-day">{cell.day}</span>
                      <div className="calendar-events">
                        {cell.tasks.slice(0, 2).map((task) => (
                          <Link
                            key={task.id}
                            href={`/preview/tasks/${task.id}`}
                            className={`calendar-event ${task.status === "completed" ? "event-completed" : ""}`}
                          >
                            <span>{task.company.name.split(" ")[0]}</span>
                            {task.title}
                          </Link>
                        ))}
                        {cell.tasks.length > 2 && (
                          <Link
                            className="calendar-more"
                            href={`/preview/tasks?date=${cell.date}`}
                          >
                            View all {cell.tasks.length} assignments
                          </Link>
                        )}
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="panel-foot calendar-legend">
          <span>
            <i className="legend-dot" />
            Open work
          </span>
          <span>
            <i className="legend-dot complete-dot" />
            Completed
          </span>
          <span>Outlined day: sample snapshot, 22 Oct 2026</span>
        </div>
      </Panel>
    </>
  );
}
