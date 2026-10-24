import {
  DataBadge,
  EmptyRecords,
  RecordLink,
  DataPagination,
} from "@/features/workspace/data-views";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { pageActor } from "@/platform/auth/page-session";
import { companies } from "@/platform/application/services";
import { canManageCompanies } from "@/modules/firms";
import { companyQuery } from "@/modules/companies/contracts";
import { memberRoleLabels } from "@/features/workspace/navigation";
import { EdgeState } from "@/features/workspace/edge-state";

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
      <EdgeState
        title="Invalid search filters"
        action={
          <Link href={`/workspace/${firmId}/companies`} className="form-cancel">
            Clear filters
          </Link>
        }
      >
        Check the search text and page number.
      </EdgeState>
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
            {actor.firmName} · {memberRoleLabels[actor.role]}
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
          <span className="filter-count">
            {result.total} {result.total === 1 ? "company" : "companies"}
          </span>
        </form>
        {result.items.length ? (
          <div
            className="table-scroll"
            role="region"
            aria-label="Company records table"
            tabIndex={0}
          >
            <table className="data-table workspace-data-table">
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
                      <RecordLink href={`${path}/${company.id}`}>
                        {company.name}
                      </RecordLink>
                    </td>
                    <td>{company.companyType ?? "Not provided"}</td>
                    <td>
                      {company.contactEmail ?? (
                        <span className="data-muted">Not provided</span>
                      )}
                    </td>
                    <td>
                      <DataBadge
                        value={company.archivedAt ? "archived" : "active"}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyRecords
            title={
              result.total > 0
                ? "No companies on this page"
                : query.q
                  ? "No matching companies"
                  : query.archived === "active"
                    ? "No active companies"
                    : "No companies yet"
            }
            action={
              result.total > 0 ? (
                <Link href={pageLink(1)} className="form-cancel">
                  First page
                </Link>
              ) : canManageCompanies(actor.role) && !query.q ? (
                <Button asChild>
                  <Link href={`${path}/new`}>Add company record</Link>
                </Button>
              ) : undefined
            }
          >
            {result.total > 0
              ? "This page has no records. Return to the first page or adjust your filters."
              : query.q
                ? "Try another company name or clear the filters."
                : query.archived === "active"
                  ? "No active companies match this view. Include archived records to find a company that was archived."
                  : canManageCompanies(actor.role)
                    ? "Add a company to start organizing its records."
                    : "Company records will appear here when your administrator or manager adds them."}
          </EmptyRecords>
        )}
        <DataPagination
          label="Company pages"
          total={result.total}
          page={query.page}
          count={result.items.length}
          pageLink={pageLink}
        />
      </section>
    </>
  );
}
