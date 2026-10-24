import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test("legacy preview bookmarks enter the workspace without fictional records", async ({
  page,
  request,
}) => {
  for (const path of [
    "/preview",
    "/preview/companies",
    "/preview/tasks/30000000-0000-4000-8000-000000000001",
    "/preview/calendar?month=2026-10",
    "/preview/settings",
    "/preview/unknown",
  ]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/workspace$/);
    await expect(
      page.getByRole("heading", { name: "Sign-in is unavailable" }),
    ).toBeVisible();
    await expect(page.getByText("Demo Firm", { exact: true })).toHaveCount(0);
  }
  expect((await request.get("/samples/review-checklist.txt")).status()).toBe(
    404,
  );
});
test("homepage navigation, workflow and FAQ explain the real product", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("link", { name: "Features", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "One place for the moving parts." }),
  ).toBeVisible();
  await page
    .locator("summary")
    .filter({ hasText: "How do I get access?" })
    .click();
  await expect(
    page.getByText(/Public self-registration is not currently available/),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Sign in to your workspace", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Sign-in is unavailable" }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Back to homepage", exact: true })
    .click();
  await expect(page).toHaveURL(/\/$/);
});
test("public entry screens support mobile layout and accessibility", async ({
  page,
}) => {
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of ["/", "/login", "/workspace"]) {
      await page.goto(route);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
        `${route} at ${width}px`,
      ).toBe(true);
      const result = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      expect(result.violations).toEqual([]);
    }
  }
});
