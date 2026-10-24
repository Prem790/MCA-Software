import { expect, it } from "vitest";
import { addCalendarMonths, indiaToday, isDateOnly } from "@/lib/work-dates";
import { nextOccurrenceDate } from "@/modules/compliance/domain/recurrence";
import { obligationInput } from "@/modules/compliance/contracts";
import { taskQuery } from "@/modules/tasks/contracts";
import {
  completionIssue,
  mayTransition,
  mayWorkOnTask,
} from "@/modules/tasks/domain/work-policy";
it("rejects impossible calendar dates and handles leap years", () => {
  expect(isDateOnly("2027-02-29")).toBe(false);
  expect(isDateOnly("2028-02-29")).toBe(true);
  expect(isDateOnly("2026-04-31")).toBe(false);
  expect(isDateOnly("1999-12-31")).toBe(false);
});
it("keeps the original monthly anchor instead of drifting after February", () => {
  expect(nextOccurrenceDate("2027-01-31", "monthly", 0)).toBe("2027-02-28");
  expect(nextOccurrenceDate("2027-01-31", "monthly", 1)).toBe("2027-03-31");
  expect(nextOccurrenceDate("2028-02-29", "annual", 3)).toBe("2032-02-29");
  expect(nextOccurrenceDate("2027-01-31", "quarterly", 0)).toBe("2027-04-30");
  expect(nextOccurrenceDate("2027-01-31", "none", 0)).toBeNull();
  expect(() => addCalendarMonths("2199-12-31", 1)).toThrow();
});
it("uses the India calendar day and accepts empty all-company/all-assignee filter values", () => {
  expect(indiaToday(new Date("2026-10-23T18:29:59Z"))).toBe("2026-10-23");
  expect(indiaToday(new Date("2026-10-23T18:30:00Z"))).toBe("2026-10-24");
  expect(taskQuery.parse({ companyId: "", assigneeId: "" })).toMatchObject({
    companyId: undefined,
    assigneeId: undefined,
  });
});
it("requires explicit deadline confirmation", () => {
  expect(
    obligationInput.safeParse({
      companyId: "10000000-0000-4000-8000-000000000001",
      title: "Test obligation",
      description: "",
      reportingPeriod: "October 2026",
      dueDate: "2026-10-31",
      confirmed: false,
    }).success,
  ).toBe(false);
});
it("limits staff work to assigned tasks and reserves reopening for managers", () => {
  expect(mayWorkOnTask("staff", "staff-a", "staff-b")).toBe(false);
  expect(mayWorkOnTask("staff", "staff-a", "staff-a")).toBe(true);
  expect(mayTransition("staff", "completed", "in_progress")).toBe(false);
  expect(mayTransition("manager", "completed", "in_progress")).toBe(true);
  expect(mayTransition("manager", "completed", "not_started")).toBe(false);
  expect(mayTransition("staff", "approved", "completed")).toBe(true);
});
it("requires a finished checklist and meaningful completion evidence", () => {
  expect(completionIssue(1, "Source records checked")).toBe("checklist");
  expect(completionIssue(0, "  ")).toBe("evidence");
  expect(completionIssue(0, "Source records checked")).toBeNull();
});
