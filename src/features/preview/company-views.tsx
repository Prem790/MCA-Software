import Link from "next/link";
import { ArrowLeft, ArrowUpRight, Building2, MapPin, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { companies, documents, tasks, type PreviewCompany } from "./data";
import {
  Avatar,
  CompanyMark,
  EmptyState,
  PageHeading,
  Panel,
  SearchField,
} from "./components";
import {
  companyProgress,
  filterCompanies,
  isOverdue,
  queryText,
  type SearchParams,
} from "./selectors";
import { PreviewAction } from "./preview-action";
import { TaskTable } from "./task-table";

export function CompanyList({ params }: { params: SearchParams }) {
  const items = filterCompanies(params);
  return (
    <>
      <PageHeading
        eyebrow="YOUR PORTFOLIO"
        title="Companies"
        description="Keep each company’s information and work in one place."
        action={
          <PreviewAction
            label="Add company"
            description="Add a company’s details and contacts, then connect its directors and assignments."
          />
        }
      />
      <div className="summary-strip">
        <span>
          <Building2 size={16} aria-hidden="true" />
          <strong>{companies.length}</strong> sample companies
        </span>
        <span>
          <MapPin size={16} aria-hidden="true" />
          {new Set(companies.map((company) => company.city)).size} locations
        </span>
        <span className="summary-strip-note">All records are fictional</span>
      </div>
      <Panel>
        <form className="filter-bar" action="/preview/companies">
          <SearchField
            defaultValue={queryText(params.q)}
            label="Search companies"
            placeholder="Search companies, locations…"
          />
          <label className="select-label">
            <span className="sr-only">Company type</span>
            <select name="type" defaultValue={queryText(params.type) || "all"}>
              <option value="all">All company types</option>
              <option>Private company</option>
              <option>LLP</option>
            </select>
          </label>
          <Button type="submit" variant="outline" size="sm">
            Search
          </Button>
          {(params.q || params.type) && (
            <Link className="text-link" href="/preview/companies">
              Clear
            </Link>
          )}
          <span className="filter-count">{items.length} companies</span>
        </form>
        {items.length ? (
          <div className="table-scroll">
            <table className="data-table company-table">
              <caption className="sr-only">Fictional company portfolio</caption>
              <thead>
                <tr>
                  <th scope="col">Company</th>
                  <th scope="col">Type & location</th>
                  <th scope="col">Relationship owner</th>
                  <th scope="col">Assignment progress</th>
                  <th scope="col">Attention</th>
                  <th scope="col">
                    <span className="sr-only">Details</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((company) => {
                  const progress = companyProgress(company.id);
                  const overdue = tasks.filter(
                    (task) => task.companyId === company.id && isOverdue(task),
                  ).length;
                  return (
                    <tr key={company.id}>
                      <td>
                        <Link
                          className="company-cell"
                          href={`/preview/companies/${company.id}`}
                        >
                          <CompanyMark company={company} />
                          <span>
                            <strong>{company.name}</strong>
                            <small>{company.industry}</small>
                          </span>
                        </Link>
                      </td>
                      <td>
                        {company.type}
                        <small className="cell-secondary">{company.city}</small>
                      </td>
                      <td>
                        <div className="person-cell">
                          <Avatar {...company.owner} />
                          <span>{company.owner.name}</span>
                        </div>
                      </td>
                      <td>
                        <div className="table-progress">
                          <span>
                            {progress.complete} of {progress.total} completed
                          </span>
                          <div className="progress-track">
                            <span style={{ width: `${progress.percent}%` }} />
                          </div>
                        </div>
                      </td>
                      <td>
                        {overdue ? (
                          <span className="attention-count">
                            {overdue} overdue
                          </span>
                        ) : (
                          <span className="status-badge status-completed">
                            On track
                          </span>
                        )}
                      </td>
                      <td>
                        <Link
                          className="row-open"
                          href={`/preview/companies/${company.id}`}
                          aria-label={`View ${company.name}`}
                        >
                          <ArrowUpRight size={17} />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState resetHref="/preview/companies" />
        )}
        <div className="panel-foot">
          Company records and their linked work will be editable in the MVP.
        </div>
      </Panel>
    </>
  );
}

export function CompanyDetail({
  company,
  tab,
}: {
  company: PreviewCompany;
  tab: string;
}) {
  const relatedTasks = tasks.filter((task) => task.companyId === company.id);
  const progress = companyProgress(company.id);
  const tabs = ["overview", "assignments", "documents", "directors"];
  const selected = tabs.includes(tab) ? tab : "overview";
  return (
    <>
      <Link className="back-link" href="/preview/companies">
        <ArrowLeft size={15} aria-hidden="true" />
        All companies
      </Link>
      <div className="company-detail-heading">
        <CompanyMark company={company} />
        <div>
          <p className="eyebrow">FICTIONAL COMPANY RECORD</p>
          <h1>{company.name}</h1>
          <p>
            {company.type}
            <span>·</span>
            {company.city}
            <span>·</span>
            {company.industry}
          </p>
        </div>
        <PreviewAction
          label="Edit company"
          description="Update company information, contacts, and record details in the functional MVP."
          variant="outline"
        />
      </div>
      <div className="tabs" aria-label="Company sections">
        {tabs.map((item) => (
          <Link
            key={item}
            href={`/preview/companies/${company.id}?tab=${item}`}
            aria-current={selected === item ? "page" : undefined}
            className={selected === item ? "tab-active" : ""}
          >
            {item === "assignments"
              ? "Assignments"
              : item.charAt(0).toUpperCase() + item.slice(1)}
          </Link>
        ))}
      </div>
      {selected === "overview" && (
        <div className="detail-grid">
          <Panel
            title="Company information"
            description="A single reference point for your team."
          >
            <dl className="detail-fields">
              <div>
                <dt>Company name</dt>
                <dd>{company.name}</dd>
              </div>
              <div>
                <dt>Company identification number</dt>
                <dd className="muted-note">Not added in this sample</dd>
              </div>
              <div>
                <dt>Contact email</dt>
                <dd>{company.contactEmail}</dd>
              </div>
              <div>
                <dt>Location</dt>
                <dd>{company.city} · Fictional address</dd>
              </div>
              <div>
                <dt>Relationship owner</dt>
                <dd>
                  <span className="person-cell">
                    <Avatar {...company.owner} />
                    {company.owner.name}
                  </span>
                </dd>
              </div>
              <div>
                <dt>Record category</dt>
                <dd>Demonstration only</dd>
              </div>
            </dl>
          </Panel>
          <Panel title="Work summary">
            <div className="company-work-summary">
              <strong>{progress.percent}%</strong>
              <p>of sample assignments completed</p>
              <div className="progress-track">
                <span style={{ width: `${progress.percent}%` }} />
              </div>
              <dl>
                <div>
                  <dt>Total assignments</dt>
                  <dd>{progress.total}</dd>
                </div>
                <div>
                  <dt>Completed</dt>
                  <dd>{progress.complete}</dd>
                </div>
                <div>
                  <dt>Overdue</dt>
                  <dd>{relatedTasks.filter(isOverdue).length}</dd>
                </div>
              </dl>
              <Button asChild variant="outline">
                <Link href={`/preview/companies/${company.id}?tab=assignments`}>
                  View assignments
                  <ArrowUpRight size={14} />
                </Link>
              </Button>
            </div>
          </Panel>
        </div>
      )}
      {selected === "assignments" && (
        <Panel
          title="Company assignments"
          action={
            <PreviewAction
              label="New assignment"
              description="Create a new assignment linked to this company."
            />
          }
        >
          <TaskTable items={relatedTasks} />
        </Panel>
      )}
      {selected === "documents" && (
        <Panel title="Company documents">
          <div className="document-simple-list">
            {documents
              .filter((document) => document.company.id === company.id)
              .map((document) => (
                <a key={document.id} href={document.href} download>
                  <span>
                    <strong>{document.name}</strong>
                    <small>Fictional sample · {document.category}</small>
                  </span>
                  <span className="text-link">
                    Download sample
                    <ArrowUpRight size={14} />
                  </span>
                </a>
              ))}
          </div>
        </Panel>
      )}
      {selected === "directors" && (
        <Panel
          title="Directors and officers"
          action={
            <PreviewAction
              label="Add director"
              description="Associate a director with this company and maintain designation and appointment information."
            />
          }
        >
          {company.id === companies[0]!.id ? (
            <div className="director-card">
              <Avatar name="Alex Example" initials="AE" />
              <div>
                <strong>Alex Example</strong>
                <p>Sample director · Fictional person</p>
                <span>DIN not provided</span>
              </div>
              <Plus size={18} aria-hidden="true" />
            </div>
          ) : (
            <EmptyState
              title="No sample directors"
              description="Director associations will appear here when added in the MVP."
            />
          )}
        </Panel>
      )}
    </>
  );
}
