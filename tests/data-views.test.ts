import { expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { displayDate, resultSummary } from "@/features/workspace/data-display";
import { DataPagination } from "@/features/workspace/data-views";

it("renders calendar dates without shifting or normalizing invalid input", () => {
  expect(displayDate("2028-02-29")).toBe("29 Feb 2028");
  expect(displayDate("2026-01-01")).toBe("1 Jan 2026");
  expect(displayDate("2026-02-29")).toBe("Date unavailable");
  expect(displayDate("2026-01-01T00:00:00Z")).toBe("Date unavailable");
  expect(displayDate(null)).toBe("Not set");
});

it("describes partial and empty pages without inventing a reversed record range", () => {
  expect(resultSummary(1, 1, 1)).toBe("1 of 1 record");
  expect(resultSummary(23, 2, 3)).toBe("21–23 of 23 records");
  expect(resultSummary(0, 1, 0)).toBe("0 records");
  expect(resultSummary(23, 3, 0)).toBe("No records on this page · 23 total");
});

it("keeps available page destinations and omits unavailable navigation", () => {
  const markup = renderToStaticMarkup(
    createElement(DataPagination, {
      label: "Company pages",
      total: 23,
      page: 2,
      count: 3,
      pageLink: (page: number) => `/companies?q=cedar&page=${page}`,
    }),
  );
  expect(markup).toContain('href="/companies?q=cedar&amp;page=1"');
  expect(markup).toContain("Previous page");
  expect(markup).not.toContain("Next page");
  const empty = renderToStaticMarkup(
    createElement(DataPagination, {
      label: "Company pages",
      total: 0,
      page: 1,
      count: 0,
      pageLink: (page: number) => `/companies?page=${page}`,
    }),
  );
  expect(empty).toContain("0 records");
  expect(empty).not.toContain("href=");
});
