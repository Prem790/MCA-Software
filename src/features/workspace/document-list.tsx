import Link from "next/link";
import type { DocumentSummary } from "@/modules/documents/contracts";
export function DocumentList({
  firmId,
  items,
}: {
  firmId: string;
  items: DocumentSummary[];
}) {
  return items.length ? (
    <ul className="workspace-activity work-preserve">
      {items.map((file) => (
        <li key={file.id}>
          <a
            className="text-link"
            href={`/api/firms/${firmId}/documents/${file.id}/download`}
          >
            {file.originalName}
          </a>
          <span>
            {Math.ceil(file.sizeBytes / 1024)} KB ·{" "}
            {file.createdAt.toISOString().slice(0, 10)}
          </span>
          {file.taskId && (
            <Link href={`/workspace/${firmId}/tasks/${file.taskId}`}>
              Open linked task
            </Link>
          )}
        </li>
      ))}
    </ul>
  ) : (
    <p>No supporting documents uploaded yet.</p>
  );
}
