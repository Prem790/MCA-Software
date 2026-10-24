import Link from "next/link";
import { ArrowLeft, ArrowRight, FolderOpen } from "lucide-react";
import type { ReactNode } from "react";
import { isDateOnly } from "@/lib/work-dates";
import { displayDate, displayLabel, resultSummary } from "./data-display";

export function RecordLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link href={href} className="record-link">
      <span>{children}</span>
      <ArrowRight size={15} aria-hidden="true" />
    </Link>
  );
}

export function DateLabel({ value }: { value: string | null | undefined }) {
  return value && isDateOnly(value) ? (
    <time dateTime={value}>{displayDate(value)}</time>
  ) : (
    <span className="data-muted">{displayDate(value)}</span>
  );
}

const tones: Record<string, string> = {
  active: "success",
  archived: "neutral",
  approved: "success",
  completed: "success",
  in_progress: "info",
  submitted_for_review: "review",
  waiting_for_documents: "warning",
  changes_requested: "warning",
  high: "warning",
  urgent: "danger",
  normal: "info",
  confirmed: "success",
  unconfirmed: "warning",
  pending: "review",
  submitted: "info",
  accepted: "success",
  expired: "warning",
  cancelled: "neutral",
  failed: "danger",
};
export function DataBadge({
  value,
  children,
}: {
  value: string | null | undefined;
  children?: ReactNode;
}) {
  return (
    <span
      className="data-badge"
      data-tone={(value && tones[value]) || "neutral"}
    >
      {children ?? displayLabel(value)}
    </span>
  );
}

export function EmptyRecords({
  title,
  children,
  action,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="workspace-empty data-empty">
      <FolderOpen size={28} aria-hidden="true" />
      <h2>{title}</h2>
      <p>{children}</p>
      {action && <div className="data-empty-action">{action}</div>}
    </div>
  );
}

export function DataPagination({
  label,
  total,
  page,
  count,
  pageLink,
}: {
  label: string;
  total: number;
  page: number;
  count: number;
  pageLink: (page: number) => string;
}) {
  return (
    <nav className="workspace-pagination" aria-label={label}>
      <span>
        {resultSummary(total, page, count)}{" "}
        <span className="pagination-page">· Page {page}</span>
      </span>
      <div className="pagination-actions">
        {page > 1 && (
          <Link href={pageLink(page - 1)}>
            <ArrowLeft size={15} aria-hidden="true" />
            Previous page
          </Link>
        )}
        {page * 20 < total && (
          <Link href={pageLink(page + 1)}>
            Next page
            <ArrowRight size={15} aria-hidden="true" />
          </Link>
        )}
      </div>
    </nav>
  );
}
