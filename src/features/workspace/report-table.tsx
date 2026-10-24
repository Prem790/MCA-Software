import Link from "next/link";
import type { ReportKind, ReportRow } from "@/modules/reporting/contracts";
export function ReportTable({
  firmId,
  kind,
  items,
}: {
  firmId: string;
  kind: ReportKind;
  items: ReportRow[];
}) {
  if (!items.length)
    return (
      <div className="workspace-empty">
        <p>No matching {kind}. Try another filter or create a record.</p>
      </div>
    );
  return (
    <div className="table-scroll">
      <table className="data-table">
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
                <Link
                  className="text-link"
                  href={`/workspace/${firmId}/${kind}/${row.id}`}
                >
                  {row.title}
                </Link>
              </td>
              <td>
                {row.companyName}
                {row.companyArchivedAt ? " (archived)" : ""}
              </td>
              <td>{row.dueDate}</td>
              {kind === "tasks" ? (
                <>
                  <td>
                    {row.assigneeName ?? "Unassigned"}
                    {row.assigneeRevokedAt ? " (access removed)" : ""}
                  </td>
                  <td>{row.priority}</td>
                  <td>{row.status?.replaceAll("_", " ")}</td>
                </>
              ) : (
                <>
                  <td>{row.reportingPeriod}</td>
                  <td>
                    {row.confirmed ? "User confirmed" : "Needs confirmation"}
                  </td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
