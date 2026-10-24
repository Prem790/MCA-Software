import { expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { displayMonth } from "@/features/workspace/data-display";
import { ReportFilters } from "@/features/workspace/report-filters";
import { reportQuery } from "@/modules/reporting/contracts";

it("formats supported calendar months without timezone or date rollover", () => {
  expect(displayMonth("2028-02")).toBe("February 2028");
  expect(displayMonth("2199-12")).toBe("December 2199");
  expect(displayMonth("2028-13")).toBe("Month unavailable");
  expect(displayMonth("2028-2")).toBe("Month unavailable");
});

it("keeps task-only and date filters in an open disclosure when selected", () => {
  const markup = renderToStaticMarkup(
    createElement(ReportFilters, {
      path: "/workspace/f/reports/tasks",
      kind: "tasks",
      options: { companies: [], members: [], limited: false },
      query: reportQuery.parse({
        dateFrom: "2028-02-01",
        status: "completed",
        obligationId: "10000000-0000-4000-8000-000000000001",
      }),
    }),
  );
  expect(markup).toContain('<details class="report-advanced" open=""');
  expect(markup).toContain('name="dateFrom"');
  expect(markup).toContain('value="2028-02-01"');
  expect(markup).toContain('name="obligationId"');
});
