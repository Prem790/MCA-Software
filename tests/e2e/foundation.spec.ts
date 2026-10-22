import { test, expect } from "@playwright/test";

test("preview is available while foundation authentication stays disabled", async ({
  page,
  request,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  await expect(page).toHaveURL(/\/preview$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Your practice, at a glance.",
  );
  await expect(
    page.getByText("Explore with fictional data. Changes aren’t saved."),
  ).toBeVisible();
  await page.screenshot({ path: ".work/phase-1-desktop.png", fullPage: true });
  expect((await request.get("/api/health")).status()).toBe(200);
  expect((await request.get("/api/readiness")).status()).toBe(503);
  expect((await request.get("/api/auth/get-session")).status()).toBe(503);
});
