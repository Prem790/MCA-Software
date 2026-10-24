import { displayLabel } from "./data-display";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { taskStatuses } from "@/modules/tasks";
import { taskPriorities, type WorkOptions } from "@/modules/tasks/contracts";
import type { ReportKind, ReportQuery } from "@/modules/reporting/contracts";
export function CompanyPicker({
  companies,
  selected,
}: {
  companies: WorkOptions["companies"];
  selected?: string;
}) {
  return (
    <label className="field-label">
      Company
      <select name="companyId" defaultValue={selected ?? ""}>
        <option value="">All companies</option>
        {companies.map((item) => (
          <option value={item.id} key={item.id}>
            {item.name}
          </option>
        ))}
      </select>
    </label>
  );
}
export function ReportFilters({
  path,
  query,
  options,
  kind,
}: {
  path: string;
  query: ReportQuery;
  options: WorkOptions;
  kind: ReportKind;
}) {
  const advancedActive = !!(
    query.dateFrom ||
    query.dateTo ||
    query.archived !== "active" ||
    (kind === "tasks" &&
      (query.status !== "all" ||
        query.priority !== "all" ||
        query.assigneeId ||
        query.reviewer !== "all"))
  );
  return (
    <form
      className="workspace-form report-filter-form"
      action={path}
      aria-label="Report filters"
    >
      <div className="report-filter-grid">
        <label className="field-label">
          Search titles
          <input
            name="q"
            type="search"
            defaultValue={query.q}
            maxLength={200}
          />
        </label>
        <CompanyPicker
          companies={options.companies}
          selected={query.companyId}
        />
        <label className="field-label">
          Due window
          <select name="due" defaultValue={query.due}>
            <option value="all">All dates</option>
            <option value="overdue">
              {kind === "tasks"
                ? "Overdue unfinished tasks"
                : "Past obligation dates"}
            </option>
            <option value="upcoming">Today through next 7 days</option>
          </select>
        </label>
      </div>
      <details className="report-advanced" open={advancedActive}>
        <summary>More filters{advancedActive ? " · active" : ""}</summary>
        <div className="report-filter-grid">
          <label className="field-label">
            Due from
            <input
              type="date"
              name="dateFrom"
              defaultValue={query.dateFrom ?? ""}
              min="2000-01-01"
              max="2199-12-31"
            />
          </label>
          <label className="field-label">
            Due through
            <input
              type="date"
              name="dateTo"
              defaultValue={query.dateTo ?? ""}
              min="2000-01-01"
              max="2199-12-31"
            />
          </label>
          <label className="field-label">
            Company status
            <select name="archived" defaultValue={query.archived}>
              <option value="active">Active companies</option>
              <option value="all">Include archived companies</option>
            </select>
          </label>
          {kind === "tasks" && (
            <>
              <label className="field-label">
                Status
                <select name="status" defaultValue={query.status}>
                  <option value="all">All statuses</option>
                  {taskStatuses.map((status) => (
                    <option key={status} value={status}>
                      {displayLabel(status)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field-label">
                Priority
                <select name="priority" defaultValue={query.priority}>
                  <option value="all">All priorities</option>
                  {taskPriorities.map((priority) => (
                    <option key={priority} value={priority}>
                      {displayLabel(priority)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field-label">
                Assignee
                <select name="assigneeId" defaultValue={query.assigneeId ?? ""}>
                  <option value="">All assignees</option>
                  <option value="me">Assigned to me</option>
                  <option value="unassigned">Unassigned</option>
                  {options.members.map((person) => (
                    <option key={person.id} value={person.id}>
                      {person.name}
                    </option>
                  ))}
                  {query.assigneeId &&
                    !["me", "unassigned"].includes(query.assigneeId) &&
                    !options.members.some(
                      (person) => person.id === query.assigneeId,
                    ) && (
                      <option value={query.assigneeId}>
                        Selected member (outside active picker)
                      </option>
                    )}
                </select>
              </label>
              <label className="field-label">
                Review queue
                <select name="reviewer" defaultValue={query.reviewer}>
                  <option value="all">All work</option>
                  <option value="me">Pending my review</option>
                </select>
              </label>
              {query.obligationId && (
                <input
                  type="hidden"
                  name="obligationId"
                  value={query.obligationId}
                />
              )}
            </>
          )}
        </div>
      </details>
      <p className="workspace-note">
        {query.q ? `Search: “${query.q}”. ` : ""}Scope:{" "}
        {options.companies.find((company) => company.id === query.companyId)
          ?.name ?? "all companies"}
        .{" "}
        {query.archived === "all"
          ? "Includes archived companies."
          : "Active companies only."}
        {query.obligationId ? " Limited to the linked obligation." : ""}
      </p>
      {options.limited && (
        <p className="workspace-note">
          Pickers show the first 200 active companies/members. Existing selected
          filters are retained.
        </p>
      )}
      <div className="workspace-actions">
        <Button type="submit">Apply filters</Button>
        <Link className="text-link" href={path}>
          Clear filters
        </Link>
      </div>
    </form>
  );
}
