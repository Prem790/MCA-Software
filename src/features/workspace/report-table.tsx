import {
  ScrollableTable,
  DataBadge,
  DateLabel,
  EmptyRecords,
  RecordLink,
} from "./data-views";
import type { ReportKind, ReportRow } from "@/modules/reporting/contracts";
export function ReportTable({
  firmId,
  kind,
  items,
  emptyTitle = "No matching records",
  emptyDescription = "Try another filter or clear the current selection.",
}: {
  firmId: string;
  kind: ReportKind;
  items: ReportRow[];
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  if (!items.length)
    return <EmptyRecords title={emptyTitle}>{emptyDescription}</EmptyRecords>;
  return (
    <ScrollableTable label="Report records table">
      <table className="data-table workspace-data-table">
        <caption className="sr-only">
          {kind === "tasks" ? "Task report" : "Obligation report"}
        </caption>
        <thead>
          <tr>
            <th scope="col">Title</th>
            <th scope="col">Company</th>
            <th scope="col">Due date</th>
            {kind === "tasks" ? (
              <>
                <th scope="col">Assignee</th>
                <th scope="col">Priority</th>
                <th scope="col">Status</th>
              </>
            ) : (
              <>
                <th scope="col">Period</th>
                <th scope="col">Confirmation</th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {items.map((row) => (
            <tr key={row.id}>
              <td>
                <RecordLink href={`/workspace/${firmId}/${kind}/${row.id}`}>
                  {row.title}
                </RecordLink>
              </td>
              <td>
                {row.companyName}
                {row.companyArchivedAt && (
                  <span className="cell-secondary">Archived company</span>
                )}
              </td>
              <td>
                <DateLabel value={row.dueDate} />
              </td>
              {kind === "tasks" ? (
                <>
                  <td>
                    {row.assigneeName ?? "Unassigned"}
                    {row.assigneeRevokedAt && (
                      <span className="cell-secondary">Access removed</span>
                    )}
                  </td>
                  <td>
                    <DataBadge value={row.priority} />
                  </td>
                  <td>
                    <DataBadge value={row.status} />
                  </td>
                </>
              ) : (
                <>
                  <td>{row.reportingPeriod}</td>
                  <td>
                    <DataBadge
                      value={row.confirmed ? "confirmed" : "unconfirmed"}
                    >
                      {row.confirmed ? "User confirmed" : "Needs confirmation"}
                    </DataBadge>
                  </td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </ScrollableTable>
  );
}
