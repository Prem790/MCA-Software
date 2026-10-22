import Link from "next/link";
import { ArrowLeft, ArrowUpRight, CheckSquare2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { taskStatuses } from "@/modules/tasks";
import { team, type PreviewTask } from "./data";
import {
  Avatar,
  PageHeading,
  Panel,
  SearchField,
  StatusBadge,
} from "./components";
import {
  filterTasks,
  formatDate,
  isOverdue,
  queryText,
  statusLabels,
  type SearchParams,
} from "./selectors";
import { TaskTable } from "./task-table";
import { PreviewAction } from "./preview-action";
import { TaskInteraction } from "./task-interaction";

export function AssignmentList({
  params,
  compliance = false,
}: {
  params: SearchParams;
  compliance?: boolean;
}) {
  const items = filterTasks(params);
  const action = compliance ? "/preview/compliance" : "/preview/tasks";
  return (
    <>
      <PageHeading
        eyebrow={compliance ? "STAY ONE STEP AHEAD" : "YOUR TEAM’S WORK"}
        title={compliance ? "Compliance tracker" : "Tasks & reviews"}
        description={
          compliance
            ? "Follow each sample obligation from preparation to completion."
            : "A shared view of assignments, owners, and next steps."
        }
        action={
          <PreviewAction
            label={compliance ? "Add obligation" : "New assignment"}
            description={
              compliance
                ? "Choose a company, select a reviewed obligation template, and confirm its due date."
                : "Assign work to a team member, add a checklist, and request a review."
            }
          />
        }
      />
      <Panel>
        <form className="filter-bar" action={action}>
          <SearchField
            defaultValue={queryText(params.q)}
            label="Search assignments"
            placeholder="Search assignments or companies…"
          />
          <label className="select-label">
            <span className="sr-only">Assignment status</span>
            <select
              name="status"
              defaultValue={queryText(params.status) || "all"}
            >
              <option value="all">All statuses</option>
              <option value="overdue">Overdue</option>
              {taskStatuses.map((status) => (
                <option key={status} value={status}>
                  {statusLabels[status]}
                </option>
              ))}
            </select>
          </label>
          <label className="select-label">
            <span className="sr-only">Assignee</span>
            <select
              name="assignee"
              defaultValue={queryText(params.assignee) || "all"}
            >
              <option value="all">Everyone</option>
              {team.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.name}
                </option>
              ))}
            </select>
          </label>
          {params.date && (
            <input type="hidden" name="date" value={queryText(params.date)} />
          )}
          <Button type="submit" size="sm" variant="outline">
            Search
          </Button>
          <span className="filter-count">{items.length} assignments</span>
        </form>
        {(params.q ||
          (params.status && params.status !== "all") ||
          (params.assignee && params.assignee !== "all") ||
          params.date) && (
          <div className="active-filter-note">
            <span>
              {params.date
                ? `Sample due date: ${queryText(params.date)}`
                : "Filters applied"}
            </span>
            <Link href={action} className="text-link">
              Clear filters
            </Link>
          </div>
        )}
        <TaskTable items={items} resetHref={action} />
        <div className="panel-foot">
          {compliance
            ? "Illustrative work items only. Applicability and statutory deadlines have not been verified."
            : "Open an assignment to explore its checklist, documents, and sample discussion."}
        </div>
      </Panel>
    </>
  );
}

export function AssignmentDetail({ task }: { task: PreviewTask }) {
  return (
    <>
      <Link href="/preview/tasks" className="back-link">
        <ArrowLeft size={15} aria-hidden="true" />
        All assignments
      </Link>
      <PageHeading
        eyebrow={task.company.name.toUpperCase()}
        title={task.title}
        description="A sample assignment with the context your team needs."
        action={
          <PreviewAction
            label="Edit assignment"
            variant="outline"
            description="Edit the assignment details, owner, priority, and deadline in the working MVP."
          />
        }
      />
      <div className="detail-grid task-detail-grid">
        <div className="stacked-panels">
          <TaskInteraction key={task.id} task={task} />
          <Panel
            title="Linked documents"
            description="Files associated with this sample assignment."
          >
            <a
              href="/samples/review-checklist.txt"
              className="linked-document"
              download
            >
              <span className="task-file-icon">
                <CheckSquare2 size={20} />
              </span>
              <span>
                <strong>Review checklist.txt</strong>
                <small>Fictional sample · Text document</small>
              </span>
              <span className="text-link">
                Download
                <ArrowUpRight size={14} />
              </span>
            </a>
          </Panel>
        </div>
        <Panel title="Assignment details">
          <dl className="detail-fields single-column">
            <div>
              <dt>Status</dt>
              <dd>
                <StatusBadge status={task.status} />
              </dd>
            </div>
            <div>
              <dt>Company</dt>
              <dd>
                <Link
                  href={`/preview/companies/${task.companyId}`}
                  className="text-link"
                >
                  {task.company.name}
                  <ArrowUpRight size={14} />
                </Link>
              </dd>
            </div>
            <div>
              <dt>Assigned to</dt>
              <dd>
                <span className="person-cell">
                  <Avatar {...task.assignee} />
                  {task.assignee.name}
                </span>
              </dd>
            </div>
            <div>
              <dt>Due date</dt>
              <dd className={isOverdue(task) ? "overdue-text" : ""}>
                {formatDate(task.dueDate, {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
                {isOverdue(task) && " · Overdue"}
              </dd>
            </div>
            <div>
              <dt>Priority</dt>
              <dd>{task.priority}</dd>
            </div>
            <div>
              <dt>Category</dt>
              <dd>{task.category}</dd>
            </div>
          </dl>
          <div className="detail-note">
            Sample dates demonstrate tracking. They are not confirmed statutory
            due dates.
          </div>
        </Panel>
      </div>
    </>
  );
}
