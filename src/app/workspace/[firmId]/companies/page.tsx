import Link from "next/link";
import { Button } from "@/components/ui/button";
import { pageActor } from "@/platform/auth/page-session";
import { companies } from "@/platform/application/services";
import { canManageCompanies } from "@/modules/firms";
import { companyQuery } from "@/modules/companies/contracts";

type Params = Record<string, string | string[] | undefined>;
export default async function CompanyList({
  params,
  searchParams,
}: {
  params: Promise<{ firmId: string }>;
  searchParams: Promise<Params>;
}) {
  const { firmId } = await params;
  const actor = await pageActor(firmId);
  const parsed = companyQuery.safeParse(await searchParams);
  if (!parsed.success)
    return (
      <section className="panel workspace-panel">
        <h1>Invalid search filters</h1>
        <p>Check the search text and page number.</p>
        <Link href={`/workspace/${firmId}/companies`} className="text-link">
          Clear filters
        </Link>
      </section>
    );
  const query = parsed.data;
  const result = await companies().list(actor, query);
  const path = `/workspace/${firmId}/companies`;
  const pageLink = (page: number) =>
    `${path}?${new URLSearchParams({ q: query.q, archived: query.archived, page: String(page) })}`;
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">
            {actor.firmName} · {actor.role}
          </p>
          <h1>Companies</h1>
          <p className="page-description">Your firm’s saved company records.</p>
        </div>
        {canManageCompanies(actor.role) && (
          <Button asChild>
            <Link href={`${path}/new`}>Add company</Link>
          </Button>
        )}
      </div>
      {actor.role === "staff" && (
        <p className="workspace-readonly">
          Staff access: view company records. Admins and managers can make
          changes.
        </p>
      )}
      <section className="panel">
        <form action={path} className="filter-bar">
          <label className="search-field">
            <span className="sr-only">Search companies</span>
            <input
              type="search"
              name="q"
              defaultValue={query.q}
              placeholder="Search company names…"
              maxLength={200}
            />
          </label>
          <label className="select-label">
            <span className="sr-only">Company visibility</span>
            <select name="archived" defaultValue={query.archived}>
              <option value="active">Active companies</option>
              <option value="all">Include archived</option>
            </select>
          </label>
          <Button type="submit" variant="outline" size="sm">
            Search
          </Button>
          <Link href={path} className="text-link">
            Clear filters
          </Link>
          <span className="filter-count">{result.total} companies</span>
        </form>
        {result.items.length ? (
          <div className="table-scroll">
            <table className="data-table">
              <caption className="sr-only">
                Saved company records for {actor.firmName}
              </caption>
              <thead>
                <tr>
                  <th scope="col">Company</th>
                  <th scope="col">Type</th>
                  <th scope="col">Contact email</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {result.items.map((company) => (
                  <tr key={company.id}>
                    <td>
                      <Link
                        href={`${path}/${company.id}`}
                        className="text-link"
                      >
                        {company.name}
                      </Link>
                    </td>
                    <td>{company.companyType ?? "Not provided"}</td>
                    <td>{company.contactEmail ?? "Not provided"}</td>
                    <td>{company.archivedAt ? "Archived" : "Active"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="workspace-empty">
            <h2>{query.q ? "No matching companies" : "No companies yet"}</h2>
            <p>
              {query.q
                ? "Try another company name or clear the filters."
                : "Add your first company to start organizing its records."}
            </p>
          </div>
        )}
        <nav aria-label="Company pages" className="workspace-pagination">
          <span>Page {query.page} · 20 records per page</span>
          {query.page > 1 && (
            <Link href={pageLink(query.page - 1)} className="text-link">
              Previous page
            </Link>
          )}
          {query.page * 20 < result.total && (
            <Link href={pageLink(query.page + 1)} className="text-link">
              Next page
            </Link>
          )}
        </nav>
      </section>
    </>
  );
}
