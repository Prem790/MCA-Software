import Link from "next/link";
import { Button } from "@/components/ui/button";
import { pageActor, pageRecord } from "@/platform/auth/page-session";
import { compliance, companies, tasks } from "@/platform/application/services";
import { obligationQuery } from "@/modules/compliance/contracts";
import { ObligationTable } from "@/features/workspace/work-tables";
export default async function ObligationsPage({
  params,
  searchParams,
}: {
  params: Promise<{ firmId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { firmId } = await params;
  const actor = await pageActor(firmId);
  const parsed = obligationQuery.safeParse(await searchParams);
  const path = `/workspace/${firmId}/obligations`;
  if (!parsed.success)
    return (
      <section className="panel workspace-panel">
        <h1>Invalid filters</h1>
        <Link href={path}>Clear filters</Link>
      </section>
    );
  const query = parsed.data;
  const data = await compliance().list(actor, query);
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
  const pageLink = (page: number) =>
    `${path}?${new URLSearchParams({ q: query.q, due: query.due, archived: query.archived, ...(query.companyId ? { companyId: query.companyId } : {}), page: String(page) })}`;
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">{actor.firmName}</p>
          <h1>Obligations</h1>
          <p className="page-description">
            Company-wise obligations and user-confirmed calendar dates.
          </p>
        </div>
        <div className="workspace-actions">
          <Link className="text-link" href={`/workspace/${firmId}/templates`}>
            Template library
          </Link>
          {actor.role !== "staff" && (
            <Button asChild>
              <Link href={`${path}/new`}>New obligation</Link>
            </Button>
          )}
        </div>
      </div>
      <p className="workspace-readonly">
        Due dates are entered and confirmed by your team. A past obligation date
        does not establish a missed filing; work completion is tracked on its
        tasks.
      </p>
      <section className="panel">
        <form className="filter-bar" action={path}>
          <label className="search-field">
            <span className="sr-only">Search obligation titles</span>
            <input
              name="q"
              type="search"
              defaultValue={query.q}
              maxLength={200}
              placeholder="Search obligations…"
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
            <span className="sr-only">Due dates</span>
            <select name="due" defaultValue={query.due}>
              <option value="all">All dates</option>
              <option value="overdue">Past due date</option>
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
        <ObligationTable firmId={firmId} items={data.items} />
        <nav className="workspace-pagination" aria-label="Obligation pages">
          <span>
            {data.total} obligations · page {query.page}
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
