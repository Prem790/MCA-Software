import { expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  displayFileSize,
  displayTimestamp,
} from "@/features/workspace/data-display";
import { DocumentList } from "@/features/workspace/document-list";

it("renders evidence timestamps in India time across a UTC date boundary", () => {
  expect(displayTimestamp(new Date("2026-12-31T23:30:00Z"))).toBe(
    "1 Jan 2027, 05:00 IST",
  );
  expect(displayTimestamp(new Date("invalid"))).toBe("Date unavailable");
  expect(displayFileSize(512)).toBe("512 B");
  expect(displayFileSize(3 * 1024 * 1024)).toBe("3 MB");
});

it("keeps filenames escaped and document downloads on the authenticated endpoint", () => {
  const markup = renderToStaticMarkup(
    createElement(DocumentList, {
      firmId: "firm-one",
      items: [
        {
          id: "file-one",
          originalName: "<evidence>.pdf",
          sizeBytes: 2048,
          mediaType: "application/pdf",
          createdAt: new Date("2026-01-01T00:00:00Z"),
          taskId: "task-one",
        },
      ],
    }),
  );
  expect(markup).toContain("&lt;evidence&gt;.pdf");
  expect(markup).toContain(
    'href="/api/firms/firm-one/documents/file-one/download"',
  );
  expect(markup).toContain('href="/workspace/firm-one/tasks/task-one"');
  expect(markup).toContain("2 KB");
  expect(markup).toContain("Download");
});
