import { describe, expect, it } from "vitest";
import {
  calendarMonth,
  companyProgress,
  filterCompanies,
  filterTasks,
  isOverdue,
  queryText,
} from "../src/features/preview/selectors";
import { companies, tasks } from "../src/features/preview/data";

describe("preview browsing", () => {
  it("handles repeated/oversized query values without treating arrays as search text", () => {
    expect(queryText(["Cedar", "Harbor"])).toBe("");
    expect(queryText("a".repeat(400))).toHaveLength(200);
    expect(filterCompanies({ q: "  cEdAr  " }).map((c) => c.id)).toEqual([
      companies[0]!.id,
    ]);
    expect(filterCompanies({ type: "LLP" })).toHaveLength(1);
  });
  it("combines filters and excludes completed tasks from overdue work", () => {
    const filtered = filterTasks({
      status: "overdue",
      assignee: "demo-staff",
      q: "Cedar",
    });
    expect(filtered).toHaveLength(1);
    expect(filtered[0]!.status).toBe("not_started");
    expect(isOverdue({ ...tasks[0]!, status: "completed" })).toBe(false);
    expect(filterTasks({ status: "invalid" })).toEqual([]);
    expect(filterTasks({ date: "2026-10-20" })).toHaveLength(4);
    expect(companyProgress("missing")).toEqual({
      total: 0,
      complete: 0,
      percent: 0,
    });
  });
  it("uses a fixed sample calendar, valid leap dates and year boundaries", () => {
    expect(calendarMonth("2026-13").month).toBe("2026-10");
    expect(calendarMonth(["2026-11"]).month).toBe("2026-10");
    const leap = calendarMonth("2028-02");
    expect(leap.cells.find((c) => c.date === "2028-02-29")?.inMonth).toBe(true);
    expect(leap.cells).toHaveLength(42);
    expect(calendarMonth("2026-12").next).toBe("2027-01");
    expect(calendarMonth("2026-01").previous).toBe("2025-12");
  });
});
