import { expect, it } from "vitest";
import { monthDetails } from "@/modules/reporting/domain/calendar";
import { reportCsv } from "@/modules/reporting/domain/csv";
import { calendarQuery, reportQuery } from "@/modules/reporting/contracts";
it("builds leap-year months, weekday offsets and bounded navigation", () => {
  const leap = monthDetails("2028-02");
  expect(leap.days).toHaveLength(29);
  expect(leap.last).toBe("2028-02-29");
  expect(leap.previous).toBe("2028-01");
  expect(leap.next).toBe("2028-03");
  expect(monthDetails("2026-10").offset).toBe(3);
  expect(monthDetails("2000-01").previous).toBeNull();
  expect(monthDetails("2199-12").next).toBeNull();
  expect(() => monthDetails("2026-13")).toThrow();
});
it("rejects invalid/reversed report dates and calendar days outside the month", () => {
  expect(reportQuery.safeParse({ dateFrom: "2026-02-30" }).success).toBe(false);
  expect(
    reportQuery.safeParse({ dateFrom: "2026-10-25", dateTo: "2026-10-24" })
      .success,
  ).toBe(false);
  expect(
    reportQuery.parse({
      dateFrom: "",
      dateTo: "",
      companyId: "",
      assigneeId: "",
    }).dateFrom,
  ).toBeUndefined();
  expect(
    calendarQuery.safeParse({ month: "2026-10", day: "2026-11-01" }).success,
  ).toBe(false);
  expect(calendarQuery.safeParse({ month: "1999-12" }).success).toBe(false);
  expect(calendarQuery.safeParse({ taskPage: "0" }).success).toBe(false);
});
it("quotes separators, newlines and quotes while preserving Unicode", () => {
  expect(reportCsv(["Title"], [['A, "quoted"\nपरीक्षण']])).toBe(
    '\uFEFF"Title"\r\n"A, ""quoted""\nपरीक्षण"\r\n',
  );
});
it("neutralizes spreadsheet formula prefixes, controls and full-width variants", () => {
  for (const value of [
    "=1+1",
    "+cmd",
    "-1",
    "@SUM(A1)",
    " \t=1",
    "\tvalue",
    "\rvalue",
    "\nvalue",
    "＝1+1",
    "＠SUM(A1)",
  ]) {
    expect(reportCsv(["Title"], [[value]])).toContain(`"'${value}"`);
  }
  expect(reportCsv(["Empty"], [])).toBe('\uFEFF"Empty"\r\n');
});
