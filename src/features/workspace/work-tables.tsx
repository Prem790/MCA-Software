import Link from "next/link";
import type { ObligationDetail } from "@/modules/compliance/contracts";
import type { TaskListItem } from "@/modules/tasks/contracts";
export function ObligationTable({
  firmId,
  items,
}: {
  firmId: string;
  items: ObligationDetail[];
}) {
  if (!items.length)
    return (
      <div className="workspace-empty">
        <h2>No matching obligations</h2>
        <p>Create an obligation or adjust your filters.</p>
      </div>
    );
  return (
    <div className="table-scroll">
      <table className="data-table">
        <caption className="sr-only">Company obligations</caption>
        <thead>
          <tr>
            <th scope="col">Obligation</th>
            <th scope="col">Company</th>
            <th scope="col">Period</th>
            <th scope="col">Due date</th>
            <th scope="col">Recurrence</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td>
                <Link
                  className="text-link"
                  href={`/workspace/${firmId}/obligations/${item.id}`}
                >
                  {item.title}
                </Link>
              </td>
              <td>
                {item.companyName}
                {item.companyArchivedAt ? " (archived)" : ""}
              </td>
              <td>{item.reportingPeriod}</td>
              <td>
                {item.dueDate}
                <br />
                {item.dueDateConfirmedAt
                  ? "User confirmed"
                  : "Needs confirmation"}
              </td>
              <td>{item.recurrence}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
export function TaskTable({
  firmId,
  items,
}: {
  firmId: string;
  items: TaskListItem[];
}) {
  if (!items.length)
    return (
      <div className="workspace-empty">
        <h2>No matching tasks</h2>
        <p>Create a task or adjust your filters.</p>
      </div>
    );
  return (
    <div className="table-scroll">
      <table className="data-table">
        <caption className="sr-only">Company tasks</caption>
        <thead>
          <tr>
            <th scope="col">Task</th>
            <th scope="col">Company</th>
            <th scope="col">Assignee</th>
            <th scope="col">Due date</th>
            <th scope="col">Priority</th>
            <th scope="col">Status</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td>
                <Link
                  className="text-link"
                  href={`/workspace/${firmId}/tasks/${item.id}`}
                >
                  {item.title}
                </Link>
              </td>
              <td>
                {item.companyName}
                {item.companyArchivedAt ? " (archived)" : ""}
              </td>
              <td>
                {item.assigneeName ?? "Unassigned"}
                {item.assigneeRevokedAt ? " (access removed)" : ""}
              </td>
              <td>{item.dueDate}</td>
              <td>{item.priority}</td>
              <td>{item.status.replaceAll("_", " ")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
