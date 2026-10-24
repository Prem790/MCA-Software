import { test, expect } from "@playwright/test";
test("public homepage remains available without database or authentication", async ({
  page,
  request,
}) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Your practice.",
  );
  await expect(
    page.getByRole("link", { name: "Sign in", exact: true }),
  ).toHaveAttribute("href", "/login");
  await expect(page.getByText("Demo Firm", { exact: true })).toHaveCount(0);
  expect((await request.get("/api/health")).status()).toBe(200);
  expect((await request.get("/api/readiness")).status()).toBe(503);
  expect((await request.get("/api/auth/get-session")).status()).toBe(503);
});
