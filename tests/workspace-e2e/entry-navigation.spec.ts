import { test, expect, type Page } from "../support/workspace-test";

async function signIn(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email address", { exact: true }).fill(email);
  await page
    .getByLabel("Password", { exact: true })
    .fill("test-only-password-12345");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Choose your firm", exact: true }),
  ).toBeVisible();
}

test("firm entry leads to scoped navigation with active routes and a working firm switch", async ({
  page,
}) => {
  await signIn(page, "admin@example.test");
  const account = page.getByRole("navigation", {
    name: "Account navigation",
    exact: true,
  });
  await expect(
    account.getByRole("link", { name: "My firms", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await expect(
    account.getByRole("link", { name: "Home", exact: true }),
  ).toHaveAttribute("href", "/");
  await expect(
    page.getByRole("group", {
      name: "Signed in as Test Administrator",
      exact: true,
    }),
  ).toBeVisible();
  const card = page.getByRole("link", {
    name: /Workspace Browser Test Firm.*Open firm dashboard/,
  });
  await expect(card.getByText("Administrator", { exact: true })).toBeVisible();
  await expect(card.getByRole("button")).toHaveCount(0);
  await card.click();
  await expect(page).toHaveURL(/\/dashboard$/);
  const nav = page.getByRole("navigation", {
    name: "Firm navigation",
    exact: true,
  });
  await expect(
    nav.getByRole("link", { name: "Dashboard", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await expect(
    nav.getByRole("link", { name: "Team and access", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /^Firm menu/ })).toBeHidden();
  await nav.getByRole("link", { name: "Companies", exact: true }).click();
  await expect(page).toHaveURL(/\/companies$/);
  await expect(
    nav.getByRole("link", { name: "Companies", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await expect(
    nav.getByRole("link", { name: "Dashboard", exact: true }),
  ).not.toHaveAttribute("aria-current", "page");
  await page.getByRole("link", { name: "Switch firm", exact: true }).click();
  await expect(page).toHaveURL(/\/workspace$/);
  await expect(
    page.getByRole("heading", { name: "Choose your firm", exact: true }),
  ).toBeVisible();
});

test("compact navigation supports keyboard dismissal, route changes, resize and staff destinations", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await signIn(page, "staff@example.test");
  await page
    .getByRole("link", {
      name: /Workspace Browser Test Firm.*Open firm dashboard/,
    })
    .click();
  await expect(page).toHaveURL(/\/dashboard$/);
  const menu = page.getByRole("button", { name: /^Firm menu/ });
  const nav = page.getByRole("navigation", {
    name: "Firm navigation",
    exact: true,
  });
  await expect(menu).toHaveAttribute("aria-expanded", "false");
  await expect(nav).toBeHidden();
  await menu.focus();
  await page.keyboard.press("Enter");
  await expect(menu).toHaveAttribute("aria-expanded", "true");
  await expect(nav).toBeVisible();
  await expect(
    nav.getByRole("link", { name: "Team and access", exact: true }),
  ).toHaveCount(0);
  await expect(
    nav.getByRole("link", { name: "Templates", exact: true }),
  ).toHaveCount(0);
  await nav.getByRole("link", { name: "Companies", exact: true }).focus();
  await page.keyboard.press("Escape");
  await expect(menu).toBeFocused();
  await expect(menu).toHaveAttribute("aria-expanded", "false");
  await menu.click();
  await nav.getByRole("link", { name: "Companies", exact: true }).click();
  await expect(page).toHaveURL(/\/companies$/);
  await expect(menu).toHaveAttribute("aria-expanded", "false");
  await expect(menu).toContainText("Companies");
  await expect(nav).toBeHidden();
  await menu.click();
  await page.goBack();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(menu).toHaveAttribute("aria-expanded", "false");
  await expect(menu).toContainText("Dashboard");
  await page.setViewportSize({ width: 1280, height: 900 });
  await expect(menu).toBeHidden();
  await expect(nav).toBeVisible();
  await expect(
    nav.getByRole("link", { name: "Dashboard", exact: true }),
  ).toHaveAttribute("aria-current", "page");
});
