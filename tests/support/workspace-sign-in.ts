import { expect, type Page } from "@playwright/test";

// Exercise real authentication. Fail at the response/navigation boundary instead
// of waiting for a firm card when sign-in itself was rejected or never completed.
export async function signInToFirm(page: Page, email = "admin@example.test") {
  await page.goto("/login");
  await page.getByLabel("Email address", { exact: true }).fill(email);
  await page
    .getByLabel("Password", { exact: true })
    .fill("test-only-password-12345");
  const signingIn = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === "/api/auth/sign-in/email" &&
      response.request().method() === "POST",
    { timeout: 15000 },
  );
  const [response] = await Promise.all([
    signingIn,
    page.getByRole("button", { name: "Sign in", exact: true }).click(),
  ]);
  expect(
    response.status(),
    `Workspace sign-in must succeed before selecting a firm (HTTP ${response.status()}; retry-after ${response.headers()["retry-after"] ?? "not supplied"}).`,
  ).toBe(200);
  await expect(page).toHaveURL(/\/workspace$/, { timeout: 15000 });
  await expect(
    page.getByRole("heading", { name: "Choose your firm", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("link", {
      name: /Workspace Browser Test Firm.*Open firm dashboard/,
    })
    .click();
  await expect(page).toHaveURL(/\/workspace\/[^/]+\/dashboard$/);
  const firmId = new URL(page.url()).pathname.split("/")[2];
  if (!firmId) throw new Error("Expected a firm dashboard destination.");
  return firmId;
}
