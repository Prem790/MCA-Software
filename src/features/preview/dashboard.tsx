import Link from "next/link";
import {
  ArrowRight,
  Building2,
  CheckCheck,
  ClipboardList,
  Clock3,
  TriangleAlert,
} from "lucide-react";
import { companies, tasks, activity } from "./data";
import { Avatar, PageHeading, Panel, TextLink } from "./components";
import {
  companyProgress,
  formatDate,
  isOverdue,
  statusLabels,
} from "./selectors";
import { PreviewAction } from "./preview-action";
import { TaskTable } from "./task-table";

export function Dashboard() {
  const open = tasks.filter((task) => task.status !== "completed");
  const overdue = tasks.filter(isOverdue);
  const review = tasks.filter((task) => task.status === "submitted_for_review");
  const complete = tasks.length - open.length;
  const stats = [
    {
      label: "Companies managed",
      value: companies.length,
      note: "Across your sample portfolio",
      icon: Building2,
      href: "/preview/companies",
      tone: "teal",
    },
    {
      label: "Open assignments",
      value: open.length,
      note: `${complete} completed in this snapshot`,
      icon: ClipboardList,
      href: "/preview/tasks",
      tone: "blue",
    },
    {
      label: "Overdue assignments",
      value: overdue.length,
      note: "A good place to start",
      icon: TriangleAlert,
      href: "/preview/tasks?status=overdue",
      tone: "rose",
    },
    {
      label: "Awaiting review",
      value: review.length,
      note: "Ready for a second look",
      icon: CheckCheck,
      href: "/preview/tasks?status=submitted_for_review",
      tone: "violet",
    },
  ];
  const upcoming = open
    .filter((task) => !isOverdue(task))
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .slice(0, 3);
  return (
    <>
      <PageHeading
        eyebrow="YOUR WORKSPACE"
        title="Your practice, at a glance."
        description="A clear view of your companies, deadlines, and team’s work."
        action={
          <PreviewAction
            label="New assignment"
            description="Create an assignment, choose its company and owner, and set a deadline."
          />
        }
      />
      <div className="stat-grid">
        {stats.map(({ label, value, note, icon: Icon, href, tone }) => (
          <Link href={href} className="stat-card" key={label}>
            <div className="stat-top">
              <span>{label}</span>
              <span className={`stat-icon tone-${tone}`}>
                <Icon size={18} strokeWidth={1.7} aria-hidden="true" />
              </span>
            </div>
            <strong className="stat-number">
              {value.toString().padStart(2, "0")}
            </strong>
            <p>
              {note}
              <ArrowRight size={14} aria-hidden="true" />
            </p>
          </Link>
        ))}
      </div>
      <div className="dashboard-top-grid">
        <Panel
          title="Work that needs attention"
          description="A few assignments to move forward."
          action={<TextLink href="/preview/tasks">View all</TextLink>}
        >
          <TaskTable
            compact
            items={[...overdue.slice(0, 2), ...review.slice(0, 2)].filter(
              (task, index, list) =>
                list.findIndex((item) => item.id === task.id) === index,
            )}
          />
          <div className="panel-foot">
            <span className="small-dot amber-dot" />
            Dates are illustrative and do not represent statutory deadlines.
          </div>
        </Panel>
        <Panel title="Coming up next" description="Upcoming sample deadlines.">
          <div className="deadline-list">
            {upcoming.map((task) => (
              <Link
                key={task.id}
                href={`/preview/tasks/${task.id}`}
                className="deadline-item"
              >
                <div className="date-square">
                  <strong>
                    {formatDate(task.dueDate, { day: "numeric" })}
                  </strong>
                  <span>{formatDate(task.dueDate, { month: "short" })}</span>
                </div>
                <div>
                  <strong>{task.title}</strong>
                  <p>{task.company.name}</p>
                  <span className="deadline-category">{task.category}</span>
                </div>
              </Link>
            ))}
          </div>
          <Link href="/preview/calendar" className="panel-bottom-link">
            <Clock3 size={15} aria-hidden="true" />
            Open compliance calendar
            <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </Panel>
      </div>
      <div className="dashboard-bottom-grid">
        <Panel
          title="Portfolio progress"
          description="Completed assignments, company by company."
          action={<TextLink href="/preview/companies">Companies</TextLink>}
        >
          <div className="portfolio-list">
            {companies.map((company) => {
              const progress = companyProgress(company.id);
              return (
                <div className="portfolio-row" key={company.id}>
                  <Link href={`/preview/companies/${company.id}`}>
                    {company.name}
                  </Link>
                  <div
                    className="progress-track"
                    role="progressbar"
                    aria-label={`${company.name} assignments completed`}
                    aria-valuenow={progress.percent}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    <span style={{ width: `${progress.percent}%` }} />
                  </div>
                  <span>
                    {progress.complete}/{progress.total}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="completion-note">
            <span className="completion-icon">
              <CheckCheck size={16} aria-hidden="true" />
            </span>
            <span>
              <strong>{complete} assignments completed</strong>
              <small>Progress adds up, one task at a time.</small>
            </span>
          </div>
        </Panel>
        <Panel
          title="Recent activity"
          description="A sample of how your team stays connected."
        >
          <ol className="activity-list">
            {activity.map((item, index) => (
              <li key={index}>
                <Avatar {...item.person} />
                <div>
                  <p>
                    <strong>{item.person.name}</strong> {item.action}{" "}
                    <Link href={`/preview/tasks/${item.subject.id}`}>
                      {item.subject.title.toLowerCase()}
                    </Link>
                    .
                  </p>
                  <span>{item.when} · Sample activity</span>
                </div>
              </li>
            ))}
          </ol>
          <div className="panel-foot">
            Status vocabulary includes{" "}
            {statusLabels.submitted_for_review.toLowerCase()} and approval.
          </div>
        </Panel>
      </div>
    </>
  );
}
