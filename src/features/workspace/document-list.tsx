import Link from "next/link";
import { Download, FileText } from "lucide-react";
import type { DocumentSummary } from "@/modules/documents/contracts";
import { displayFileSize, displayTimestamp } from "./data-display";
export function DocumentList({
  firmId,
  items,
}: {
  firmId: string;
  items: DocumentSummary[];
}) {
  return items.length ? (
    <ul className="document-cards">
      {items.map((file) => (
        <li key={file.id}>
          <span className="document-icon" aria-hidden="true">
            <FileText size={22} />
          </span>
          <div className="document-info">
            <strong>{file.originalName}</strong>
            <p>
              {displayFileSize(file.sizeBytes)} ·{" "}
              <time dateTime={file.createdAt.toISOString()}>
                {displayTimestamp(file.createdAt)}
              </time>
            </p>
            {file.taskId && (
              <Link
                className="text-link"
                href={`/workspace/${firmId}/tasks/${file.taskId}`}
              >
                Open linked task
              </Link>
            )}
          </div>
          <a
            className="document-download"
            href={`/api/firms/${firmId}/documents/${file.id}/download`}
            aria-label={`Download ${file.originalName}`}
          >
            <Download size={16} aria-hidden="true" />
            Download
          </a>
        </li>
      ))}
    </ul>
  ) : (
    <p className="workflow-empty">No supporting documents uploaded yet.</p>
  );
}
