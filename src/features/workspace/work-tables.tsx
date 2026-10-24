import { DataBadge, DateLabel, EmptyRecords, RecordLink } from "./data-views";
import { displayLabel } from "./data-display";
import type { ObligationDetail } from "@/modules/compliance/contracts";
import type { TaskListItem } from "@/modules/tasks/contracts";
export function ObligationTable({
  firmId,
  items,
  canCreate = false,
}: {
  firmId: string;
  items: ObligationDetail[];
  canCreate?: boolean;
}) {
  if (!items.length)
    return (
      <EmptyRecords title="No matching obligations">
        {canCreate
          ? "Create an obligation or adjust your filters."
          : "Adjust your filters or ask your manager about upcoming obligations."}
      </EmptyRecords>
    );
  return (
    <div
      className="table-scroll"
      role="region"
      aria-label="Work records table"
      tabIndex={0}
    >
      <table className="data-table workspace-data-table">
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
                <RecordLink
                  href={`/workspace/${firmId}/obligations/${item.id}`}
                >
                  {item.title}
                </RecordLink>
              </td>
              <td>
                {item.companyName}
                {item.companyArchivedAt && (
                  <span className="cell-secondary">Archived company</span>
                )}
              </td>
              <td>{item.reportingPeriod}</td>
              <td>
                <DateLabel value={item.dueDate} />
                <div className="cell-secondary">
                  <DataBadge
                    value={
                      item.dueDateConfirmedAt ? "confirmed" : "unconfirmed"
                    }
                  >
                    {item.dueDateConfirmedAt
                      ? "User confirmed"
                      : "Needs confirmation"}
                  </DataBadge>
                </div>
              </td>
              <td>{displayLabel(item.recurrence)}</td>
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
  canCreate = false,
}: {
  firmId: string;
  items: TaskListItem[];
  canCreate?: boolean;
}) {
  if (!items.length)
    return (
      <EmptyRecords title="No matching tasks">
        {canCreate
          ? "Create a task or adjust your filters."
          : "Adjust your filters or ask your manager about assigned work."}
      </EmptyRecords>
    );
  return (
    <div
      className="table-scroll"
      role="region"
      aria-label="Work records table"
      tabIndex={0}
    >
      <table className="data-table workspace-data-table">
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
                <RecordLink href={`/workspace/${firmId}/tasks/${item.id}`}>
                  {item.title}
                </RecordLink>
              </td>
              <td>
                {item.companyName}
                {item.companyArchivedAt && (
                  <span className="cell-secondary">Archived company</span>
                )}
              </td>
              <td>
                {item.assigneeName ?? "Unassigned"}
                {item.assigneeRevokedAt && (
                  <span className="cell-secondary">Access removed</span>
                )}
              </td>
              <td>
                <DateLabel value={item.dueDate} />
              </td>
              <td>
                <DataBadge value={item.priority} />
              </td>
              <td>
                <DataBadge value={item.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
