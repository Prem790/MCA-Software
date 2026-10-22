import Link from "next/link";
import { ArrowDownToLine, FileText, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { documents } from "./data";
import {
  Avatar,
  EmptyState,
  PageHeading,
  Panel,
  SearchField,
} from "./components";
import { formatDate, queryText, type SearchParams } from "./selectors";
import { PreviewAction } from "./preview-action";

export function DocumentList({ params }: { params: SearchParams }) {
  const search = queryText(params.q).toLowerCase();
  const category = queryText(params.category);
  const items = documents.filter(
    (document) =>
      (!search ||
        `${document.name} ${document.company.name}`
          .toLowerCase()
          .includes(search)) &&
      (!category || category === "all" || category === document.category),
  );
  return (
    <>
      <PageHeading
        eyebrow="EVERYTHING IN ITS PLACE"
        title="Documents"
        description="Find the right file, with its company and context attached."
        action={
          <PreviewAction
            label="Upload document"
            description="Upload a file to private storage, choose a company, and link it to an assignment. Uploading is not enabled in this preview."
          />
        }
      />
      <div className="document-summary">
        <span className="document-summary-icon">
          <FolderOpen size={28} strokeWidth={1.5} aria-hidden="true" />
        </span>
        <div>
          <strong>Your sample document library</strong>
          <p>
            {documents.length} fictional text documents · Downloads contain
            sample content only
          </p>
        </div>
        <span className="outline-badge">No private files</span>
      </div>
      <Panel>
        <form className="filter-bar" action="/preview/documents">
          <SearchField
            defaultValue={queryText(params.q)}
            label="Search documents"
            placeholder="Search documents or companies…"
          />
          <label className="select-label">
            <span className="sr-only">Document category</span>
            <select name="category" defaultValue={category || "all"}>
              <option value="all">All categories</option>
              <option>Meeting papers</option>
              <option>Checklists</option>
              <option>Company records</option>
            </select>
          </label>
          <Button variant="outline" size="sm" type="submit">
            Search
          </Button>
          {(params.q || params.category) && (
            <Link href="/preview/documents" className="text-link">
              Clear
            </Link>
          )}
          <span className="filter-count">{items.length} documents</span>
        </form>
        {items.length ? (
          <div className="table-scroll">
            <table className="data-table">
              <caption className="sr-only">Fictional sample documents</caption>
              <thead>
                <tr>
                  <th scope="col">Document name</th>
                  <th scope="col">Company</th>
                  <th scope="col">Added by</th>
                  <th scope="col">Date added</th>
                  <th scope="col">Download</th>
                </tr>
              </thead>
              <tbody>
                {items.map((document) => (
                  <tr key={document.id}>
                    <td>
                      <span className="document-name">
                        <span className="document-file-icon">
                          <FileText size={20} aria-hidden="true" />
                        </span>
                        <span>
                          <strong>{document.name}</strong>
                          <small>{document.category} · Sample text file</small>
                        </span>
                      </span>
                    </td>
                    <td>
                      <Link
                        className="subtle-link"
                        href={`/preview/companies/${document.company.id}`}
                      >
                        {document.company.name}
                      </Link>
                    </td>
                    <td>
                      <span className="person-cell">
                        <Avatar {...document.owner} />
                        {document.owner.name.split(" ")[0]}
                      </span>
                    </td>
                    <td>{formatDate(document.date)}</td>
                    <td>
                      <a
                        className="download-link"
                        href={document.href}
                        download
                        aria-label={`Download sample ${document.name}`}
                      >
                        <ArrowDownToLine size={16} aria-hidden="true" />
                        Sample
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState resetHref="/preview/documents" />
        )}
        <div className="panel-foot">
          Private uploads, file versioning, and access controls will be
          connected in later phases.
        </div>
      </Panel>
    </>
  );
}
