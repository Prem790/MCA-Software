import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("company search, empty results, sections and unavailable actions", async ({
  page,
}) => {
  await page.goto("/preview/companies");
  await page.getByRole("searchbox", { name: "Search companies" }).fill("Cedar");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await page
    .getByRole("link", { name: /^Cedar Demo Company Manufacturing$/ })
    .click();
  await expect(
    page.getByRole("heading", { name: "Company information" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Assignments", exact: true }).click();
  await expect(page.locator("tbody tr")).toHaveCount(4);
  await page.getByRole("link", { name: "Directors", exact: true }).click();
  await expect(page.getByText("Alex Example", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Add director", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "No records have been created or changed",
  );
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.goto("/preview/companies?q=zzzz-no-company");
  await expect(
    page.getByRole("heading", { name: "No matching records" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Clear filters", exact: true }).click();
  await expect(page.locator("tbody tr")).toHaveCount(5);
});

test("task filters and local checklist/comment interactions reset on reload", async ({
  page,
}) => {
  await page.goto("/preview/tasks");
  await page
    .getByLabel("Assignment status")
    .selectOption("submitted_for_review");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page.locator("tbody tr")).toHaveCount(3);
  await page.locator("tbody .table-title").first().click();
  const review = page.getByRole("button", { name: "Simulate review request" });
  await expect(review).toBeDisabled();
  await page.getByLabel("Prepare the review draft", { exact: true }).check();
  await page.getByLabel("Send to manager for review", { exact: true }).check();
  await review.click();
  await expect(page.getByRole("status")).toHaveText(
    "Review request previewed. Nothing was saved or sent.",
  );
  await page.getByRole("button", { name: "Add preview comment" }).click();
  await expect(page.locator("#comment-error")).toHaveText(
    "Write a comment before adding it.",
  );
  const comment =
    "Please check <script>alert('sample')</script> as plain text.";
  await page
    .getByRole("textbox", { name: "Your sample comment" })
    .fill(comment);
  await page.getByRole("button", { name: "Add preview comment" }).click();
  await expect(page.getByText(comment, { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText(comment, { exact: true })).toHaveCount(0);
  await expect(review).toBeDisabled();
});

test("calendar month navigation, day filtering and actual sample download", async ({
  page,
  request,
}) => {
  await page.goto("/preview/calendar");
  await page.getByRole("link", { name: "Next month", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "November 2026" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Sample month", exact: true }).click();
  await page
    .getByRole("link", { name: "View all 4 assignments" })
    .first()
    .click();
  await expect(page.locator("tbody tr")).toHaveCount(4);
  await expect(page.getByText(/Sample due date:/)).toBeVisible();
  await page.goto("/preview/documents");
  await page.getByLabel("Document category").selectOption("Checklists");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page.locator("tbody tr")).toHaveCount(2);
  const download = page.waitForEvent("download");
  await page
    .getByRole("link", { name: "Download sample Annual review checklist.txt" })
    .click();
  expect((await download).suggestedFilename()).toBe("review-checklist.txt");
  const sample = await request.get("/samples/review-checklist.txt");
  expect(sample.ok()).toBeTruthy();
  expect(await sample.text()).toMatch(/fictional/i);
});

test("settings and login clearly disclose preview behavior", async ({
  page,
}) => {
  await page.goto("/preview/settings");
  await page.getByLabel("Firm name", { exact: true }).fill("Sample changes");
  await page
    .getByRole("button", { name: "Preview changes", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "No changes were saved or sent",
  );
  await page.getByRole("button", { name: "Team members", exact: true }).click();
  await expect(
    page.getByText("not provisioned login accounts", { exact: false }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Notifications", exact: true })
    .click();
  await page.getByRole("switch", { name: "Review requests" }).uncheck();
  await page.getByRole("button", { name: "Preview preferences" }).click();
  await expect(page.getByRole("status")).toBeVisible();
  await page.goto("/login");
  await expect(
    page.getByRole("button", { name: "Sign in", exact: true }),
  ).toBeDisabled();
  await page.getByRole("link", { name: "Open sample workspace" }).click();
  await expect(page).toHaveURL(/\/preview$/);
});

test("unknown records and invalid calendar parameters recover safely", async ({
  page,
}) => {
  await page.goto("/preview/companies/unknown");
  await expect(page.getByRole("heading", { name: /not found/i })).toBeVisible();
  await page.goto("/preview/tasks/unknown");
  await expect(page.getByRole("heading", { name: /not found/i })).toBeVisible();
  await page.goto("/preview/calendar?month=bad-input");
  await expect(
    page.getByRole("heading", { name: "October 2026" }),
  ).toBeVisible();
});

test("mobile navigation supports keyboard dismissal and screens fit the viewport", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/preview");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.screenshot({ path: ".work/phase-1-mobile.png", fullPage: true });
  await expect(
    page.getByRole("navigation", { name: "Main navigation" }),
  ).not.toBeVisible();
  await page
    .getByRole("button", { name: "Open navigation", exact: true })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Workspace sidebar" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Open navigation", exact: true }),
  ).toBeFocused();
  await page
    .getByRole("button", { name: "Open navigation", exact: true })
    .click();
  await page
    .getByRole("dialog", { name: "Workspace sidebar" })
    .getByRole("link", { name: "Companies", exact: true })
    .click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Companies");
  for (const route of [
    "/preview",
    "/preview/companies",
    "/preview/tasks",
    "/preview/companies/20000000-0000-4000-8000-000000000001",
    "/preview/tasks/30000000-0000-4000-8000-000000000001",
    "/preview/calendar",
    "/preview/documents",
    "/preview/settings",
    "/login",
  ]) {
    await page.goto(route);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
      route,
    ).toBeTruthy();
  }
});

test("main preview screens pass automated WCAG A/AA checks", async ({
  page,
}) => {
  for (const route of [
    "/preview",
    "/preview/companies",
    "/preview/tasks",
    "/preview/companies/20000000-0000-4000-8000-000000000001",
    "/preview/tasks/30000000-0000-4000-8000-000000000001",
    "/preview/calendar",
    "/preview/documents",
    "/preview/settings",
    "/preview/guide",
    "/login",
  ]) {
    await page.goto(route);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect
      .soft(
        results.violations,
        `${route}: ${JSON.stringify(results.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => ({ target: n.target, summary: n.failureSummary })) })))}`,
      )
      .toEqual([]);
  }
});
