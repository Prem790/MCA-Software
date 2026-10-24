import { isDateOnly } from "@/lib/work-dates";

export function displayLabel(value: string | null | undefined) {
  if (!value) return "Not set";
  const words = value.replaceAll("_", " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export function displayDate(value: string | null | undefined) {
  if (!value) return "Not set";
  if (!isDateOnly(value)) return "Date unavailable";
  // Deadlines are calendar dates. UTC prevents browser timezone shifts.
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

export function resultSummary(
  total: number,
  page: number,
  count: number,
  pageSize = 20,
) {
  if (!total) return "0 records";
  if (!count) return `No records on this page · ${total} total`;
  const start = (page - 1) * pageSize + 1;
  const end = start + count - 1;
  const range = start === end ? String(start) : `${start}–${end}`;
  return `${range} of ${total} ${total === 1 ? "record" : "records"}`;
}

export function displayTimestamp(value: Date) {
  if (!Number.isFinite(value.getTime())) return "Date unavailable";
  return (
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Kolkata",
      dateStyle: "medium",
      timeStyle: "short",
    }).format(value) + " IST"
  );
}
export function displayFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`;
  return `${new Intl.NumberFormat("en-GB", { maximumFractionDigits: 1 }).format(bytes / (1024 * 1024))} MB`;
}

export function displayMonth(value: string) {
  if (!isDateOnly(`${value}-01`)) return "Month unavailable";
  return new Intl.DateTimeFormat("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}-01T00:00:00Z`));
}
