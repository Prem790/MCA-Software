import { signInToFirm } from "../support/workspace-sign-in";
import { test, expect } from "../support/workspace-test";

test("calendar month/day links preserve company visibility and expose the selected-day agenda", async ({
  page,
}) => {
  const firmId = await signInToFirm(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(
    `/workspace/${firmId}/calendar?month=2028-02&day=2028-02-01&archived=all`,
  );
  await expect(
    page.getByRole("heading", { name: "February 2028", exact: true }),
  ).toBeVisible();
  const days = page.getByRole("list", {
    name: "Deadline counts for February 2028",
    exact: true,
  });
  const leapDay = days.getByRole("link", { name: /^29 Feb 2028:/ });
  await expect(leapDay).toBeVisible();
  await leapDay.click();
  await expect(page).toHaveURL(/day=2028-02-29/);
  await expect(leapDay).toHaveAttribute("aria-current", "date");
  await expect(
    page.getByRole("heading", { name: /Tasks due 29 Feb 2028/ }),
  ).toBeVisible();
  const months = page.getByRole("navigation", {
    name: "Calendar months",
    exact: true,
  });
  await months.getByRole("link", { name: "Next month", exact: true }).click();
  await expect(page).toHaveURL(/month=2028-03/);
  expect(new URL(page.url()).searchParams.get("archived")).toBe("all");
  await months
    .getByRole("link", { name: "Current month", exact: true })
    .click();
  expect(new URL(page.url()).searchParams.get("archived")).toBe("all");
});

test("collapsed report filters retain selections and report types keep only compatible scope", async ({
  page,
}) => {
  const firmId = await signInToFirm(page);
  await page.goto(`/workspace/${firmId}/reports/tasks`);
  const filters = page.getByRole("form", {
    name: "Report filters",
    exact: true,
  });
  await filters.getByText("More filters", { exact: true }).click();
  await filters
    .getByRole("combobox", { name: "Status", exact: true })
    .selectOption("completed");
  await filters
    .getByRole("combobox", { name: "Company status", exact: true })
    .selectOption("all");
  await filters
    .getByLabel("Search titles", { exact: true })
    .fill("UX 5 report search");
  await filters.getByText("More filters", { exact: true }).click();
  await filters
    .getByRole("button", { name: "Apply filters", exact: true })
    .click();
  await expect(page).toHaveURL(/status=completed/);
  expect(new URL(page.url()).searchParams.get("archived")).toBe("all");
  await expect(
    filters.getByRole("combobox", { name: "Status", exact: true }),
  ).toBeVisible();
  const types = page.getByRole("navigation", {
    name: "Report types",
    exact: true,
  });
  await types
    .getByRole("link", { name: "Obligation reports", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Obligation reports", exact: true }),
  ).toBeVisible();
  const query = new URL(page.url()).searchParams;
  expect(query.get("status")).toBeNull();
  expect(query.get("q")).toBe("UX 5 report search");
  expect(query.get("archived")).toBe("all");
});

test("team confirmations can be cancelled and last-administrator protection stays visible", async ({
  page,
}) => {
  const firmId = await signInToFirm(page);
  await page.goto(`/workspace/${firmId}/team`);
  const row = page.getByRole("row").filter({ hasText: "admin@example.test" });
  await row
    .getByRole("combobox", { name: "Role for admin@example.test", exact: true })
    .selectOption("staff");
  await row.getByRole("button", { name: "Save role", exact: true }).click();
  await expect(
    row.getByRole("group", {
      name: "Confirm access change for Test Administrator",
      exact: true,
    }),
  ).toContainText("your own access");
  await row
    .getByRole("button", { name: "Keep current access", exact: true })
    .click();
  await expect(
    row.getByRole("button", { name: "Save role", exact: true }),
  ).toBeFocused();
  await row.getByRole("button", { name: "Save role", exact: true }).click();
  await row
    .getByRole("button", { name: "Confirm role change", exact: true })
    .click();
  await expect(row.getByRole("alert")).toContainText(/administrator/i);
  await expect(page).toHaveURL(/\/team$/);
  await page.reload();
  await expect(
    row.getByRole("combobox", {
      name: "Role for admin@example.test",
      exact: true,
    }),
  ).toHaveValue("admin");
});

test("export failure allows retry and successful export announces download initiation", async ({
  page,
}) => {
  const firmId = await signInToFirm(page);
  await page.goto(`/workspace/${firmId}/reports/tasks`);
  const controls = page.getByRole("group", {
    name: "Report export",
    exact: true,
  });
  const endpoint = `**/api/firms/${firmId}/reports/tasks/export?*`;
  await page.route(endpoint, (route) =>
    route.fulfill({
      status: 429,
      contentType: "application/json",
      body: JSON.stringify({
        error: { message: "Test export limit. Please retry later." },
      }),
    }),
  );
  await controls
    .getByRole("button", { name: "Download filtered CSV", exact: true })
    .click();
  await expect(controls.getByRole("alert")).toContainText("Test export limit");
  await expect(
    controls.getByRole("button", {
      name: "Download filtered CSV",
      exact: true,
    }),
  ).toBeEnabled();
  await page.unroute(endpoint);
  const downloading = page.waitForEvent("download");
  await controls
    .getByRole("button", { name: "Download filtered CSV", exact: true })
    .click();
  const download = await downloading;
  expect(download.suggestedFilename()).toBe("mca-tasks.csv");
  await expect(controls.getByRole("status")).toContainText("Download started");
});
