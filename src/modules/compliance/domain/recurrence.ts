import { addCalendarMonths } from "@/lib/work-dates";
export const recurrenceOptions = [
  "none",
  "monthly",
  "quarterly",
  "annual",
] as const;
export type Recurrence = (typeof recurrenceOptions)[number];
export function nextOccurrenceDate(
  anchor: string,
  recurrence: Recurrence,
  occurrenceNumber: number,
) {
  if (recurrence === "none") return null;
  const months = { monthly: 1, quarterly: 3, annual: 12 }[recurrence];
  return addCalendarMonths(anchor, months * (occurrenceNumber + 1));
}
