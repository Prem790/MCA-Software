import Link from "next/link";
import { Button } from "@/components/ui/button";
import { pageActor, pageRecord } from "@/platform/auth/page-session";
import { companies, compliance, tasks } from "@/platform/application/services";
import { taskPriorities, taskQuery } from "@/modules/tasks/contracts";
import { taskStatuses } from "@/modules/tasks";
import { TaskTable } from "@/features/workspace/work-tables";
export default async function TasksPage({
  params,
  searchParams,
}: {
  params: Promise<{ firmId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { firmId } = await params;
  const actor = await pageActor(firmId);
  const path = `/workspace/${firmId}/tasks`;
  const parsed = taskQuery.safeParse(await searchParams);
  if (!parsed.success)
    return (
      <section className="panel workspace-panel">
        <h1>Invalid filters</h1>
        <Link href={path}>Clear filters</Link>
      </section>
    );
  const query = parsed.data;
  const data = await tasks().list(actor, query);
  const options = await tasks().options(actor);
  if (
    query.companyId &&
    !options.companies.some((company) => company.id === query.companyId)
  ) {
    const selected = await pageRecord(() =>
      companies().detail(actor, query.companyId!),
    );
    options.companies.unshift({
      id: selected.company.id,
      name: selected.company.name,
    });
  }
  const linked = query.obligationId
    ? await pageRecord(() => compliance().detail(actor, query.obligationId!))
    : null;
  const pageLink = (page: number) =>
    `${path}?${new URLSearchParams(
      Object.entries({ ...query, page })
        .filter(
          (entry): entry is [string, string | number] => entry[1] !== undefined,
        )
        .map(([key, value]) => [key, String(value)]),
    )}`;
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">{actor.firmName}</p>
          <h1>Tasks</h1>
          <p className="page-description">
            Assigned work, deadlines, priorities and progress.
          </p>
        </div>
        {actor.role !== "staff" && (
          <Button asChild>
            <Link href={`${path}/new`}>New task</Link>
          </Button>
        )}
      </div>
      {linked && (
        <p className="workspace-readonly">
          Tasks linked to{" "}
          <Link
            className="text-link"
            href={`/workspace/${firmId}/obligations/${linked.id}`}
          >
            {linked.title}
          </Link>
          .
        </p>
      )}
      {actor.role === "staff" && (
        <p className="workspace-note">
          You can view firm tasks and update the tasks assigned to you.
        </p>
      )}
      <section className="panel">
        <form className="filter-bar work-filters" action={path}>
          {query.obligationId && (
            <input
              type="hidden"
              name="obligationId"
              value={query.obligationId}
            />
          )}
          <label className="search-field">
            <span className="sr-only">Search task titles</span>
            <input
              type="search"
              name="q"
              defaultValue={query.q}
              placeholder="Search tasks…"
              maxLength={200}
            />
          </label>
          <label className="select-label">
            <span className="sr-only">Company</span>
            <select name="companyId" defaultValue={query.companyId ?? ""}>
              <option value="">All companies</option>
              {options.companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
          </label>
          <label className="select-label">
            <span className="sr-only">Assignee</span>
            <select name="assigneeId" defaultValue={query.assigneeId ?? ""}>
              <option value="">All assignees</option>
              <option value="me">Assigned to me</option>
              <option value="unassigned">Unassigned</option>
              {options.members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
              {query.assigneeId &&
                !["me", "unassigned"].includes(query.assigneeId) &&
                !options.members.some(
                  (member) => member.id === query.assigneeId,
                ) && (
                  <option value={query.assigneeId}>
                    Selected member (not in active picker)
                  </option>
                )}
            </select>
          </label>
          <label className="select-label">
            <span className="sr-only">Task status</span>
            <select name="status" defaultValue={query.status}>
              <option value="all">All statuses</option>
              {taskStatuses.map((status) => (
                <option key={status} value={status}>
                  {status.replaceAll("_", " ")}
                </option>
              ))}
            </select>
          </label>
          <label className="select-label">
            <span className="sr-only">Priority</span>
            <select name="priority" defaultValue={query.priority}>
              <option value="all">All priorities</option>
              {taskPriorities.map((priority) => (
                <option key={priority} value={priority}>
                  {priority}
                </option>
              ))}
            </select>
          </label>
          <label className="select-label">
            <span className="sr-only">Due dates</span>
            <select name="due" defaultValue={query.due}>
              <option value="all">All dates</option>
              <option value="overdue">Overdue, unfinished</option>
              <option value="upcoming">Today through next 7 days</option>
            </select>
          </label>
          <label className="select-label">
            <span className="sr-only">Archived companies</span>
            <select name="archived" defaultValue={query.archived}>
              <option value="active">Active companies</option>
              <option value="all">Include archived</option>
            </select>
          </label>
          <Button type="submit" size="sm" variant="outline">
            Filter
          </Button>
          <Link href={path} className="text-link">
            Clear
          </Link>
        </form>
        <TaskTable firmId={firmId} items={data.items} />
        <nav className="workspace-pagination" aria-label="Task pages">
          <span>
            {data.total} tasks · page {query.page}
          </span>
          {query.page > 1 && (
            <Link href={pageLink(query.page - 1)}>Previous page</Link>
          )}
          {query.page * 20 < data.total && (
            <Link href={pageLink(query.page + 1)}>Next page</Link>
          )}
        </nav>
      </section>
    </>
  );
}
