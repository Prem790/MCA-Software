import Link from "next/link";
import { ArrowUpRight, Building2, Search, SearchX } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { TaskStatus } from "@/modules/tasks";
import { statusLabels } from "./selectors";
import type { PreviewCompany } from "./data";

export function PageHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        <p className="page-description">{description}</p>
      </div>
      {action && <div className="heading-action">{action}</div>}
    </div>
  );
}

export function Panel({
  title,
  description,
  action,
  children,
  className,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("panel", className)}>
      {title && (
        <div className="panel-heading">
          <div>
            <h2>{title}</h2>
            {description && <p>{description}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function StatusBadge({
  status,
  overdue = false,
}: {
  status: TaskStatus;
  overdue?: boolean;
}) {
  return (
    <span
      className={cn("status-badge", `status-${overdue ? "overdue" : status}`)}
    >
      <span className="status-dot" />
      {overdue ? "Overdue" : statusLabels[status]}
    </span>
  );
}

export function Avatar({
  name,
  initials,
  tone = "teal",
}: {
  name: string;
  initials: string;
  tone?: string;
}) {
  return (
    <span
      title={name}
      className={cn("avatar", `tone-${tone}`)}
      aria-label={name}
    >
      {initials}
    </span>
  );
}

export function CompanyMark({
  company,
  small = false,
}: {
  company: PreviewCompany;
  small?: boolean;
}) {
  return (
    <span
      className={cn(
        "company-mark",
        `tone-${company.tone}`,
        small && "company-mark-small",
      )}
      aria-hidden="true"
    >
      <Building2 size={small ? 16 : 22} strokeWidth={1.65} />
    </span>
  );
}

export function TextLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link href={href} className="text-link">
      {children}
      <ArrowUpRight size={14} aria-hidden="true" />
    </Link>
  );
}

export function EmptyState({
  title = "No matching records",
  description = "Try a different search or clear your filters.",
  resetHref,
}: {
  title?: string;
  description?: string;
  resetHref?: string;
}) {
  return (
    <div className="empty-state">
      <SearchX size={26} aria-hidden="true" />
      <h2>{title}</h2>
      <p>{description}</p>
      {resetHref && (
        <Link className="text-link" href={resetHref}>
          Clear filters
        </Link>
      )}
    </div>
  );
}

export function SearchField({
  name = "q",
  defaultValue = "",
  label = "Search records",
  placeholder = "Search…",
}: {
  name?: string;
  defaultValue?: string;
  label?: string;
  placeholder?: string;
}) {
  return (
    <label className="search-field">
      <Search size={16} aria-hidden="true" />
      <span className="sr-only">{label}</span>
      <input
        type="search"
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        maxLength={200}
      />
    </label>
  );
}

export function FieldLabel({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="field-label">
      <span>{label}</span>
      {children}
    </label>
  );
}
