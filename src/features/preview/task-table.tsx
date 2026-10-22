import Link from "next/link";
import { ArrowUpRight, FileCheck2 } from "lucide-react";
import type { PreviewTask } from "./data";
import { Avatar, EmptyState, StatusBadge } from "./components";
import { formatDate, isOverdue } from "./selectors";

export function TaskTable({
  items,
  compact = false,
  resetHref = "/preview/tasks",
}: {
  items: PreviewTask[];
  compact?: boolean;
  resetHref?: string;
}) {
  if (!items.length) return <EmptyState resetHref={resetHref} />;
  return (
    <div className="table-scroll">
      <table className="data-table">
        <caption className="sr-only">
          Sample assignments and their status
        </caption>
        <thead>
          <tr>
            <th scope="col">Assignment</th>
            {!compact && <th scope="col">Company</th>}
            <th scope="col">Assignee</th>
            <th scope="col">Due date</th>
            <th scope="col">Status</th>
            <th scope="col">
              <span className="sr-only">Open</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((task) => (
            <tr key={task.id}>
              <td>
                <Link
                  className="table-title"
                  href={`/preview/tasks/${task.id}`}
                >
                  <span className="task-file-icon">
                    <FileCheck2 size={16} aria-hidden="true" />
                  </span>
                  <span>
                    {task.title}
                    {compact && <small>{task.company.name}</small>}
                  </span>
                </Link>
              </td>
              {!compact && (
                <td>
                  <Link
                    href={`/preview/companies/${task.companyId}`}
                    className="subtle-link"
                  >
                    {task.company.name}
                  </Link>
                </td>
              )}
              <td>
                <div className="person-cell">
                  <Avatar {...task.assignee} />
                  <span>{task.assignee.name.split(" ")[0]}</span>
                </div>
              </td>
              <td>
                <span className={isOverdue(task) ? "overdue-text" : ""}>
                  {formatDate(task.dueDate)}
                </span>
              </td>
              <td>
                <StatusBadge status={task.status} />
              </td>
              <td>
                <Link
                  href={`/preview/tasks/${task.id}`}
                  className="row-open"
                  aria-label={`Open ${task.title} for ${task.company.name}`}
                >
                  <ArrowUpRight size={16} aria-hidden="true" />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
