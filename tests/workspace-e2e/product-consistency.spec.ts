import { test, expect, type Page } from "@playwright/test";

async function openFirm(page: Page) {
  await page.goto("/login");
  await page
    .getByLabel("Email address", { exact: true })
    .fill("admin@example.test");
  await page
    .getByLabel("Password", { exact: true })
    .fill("test-only-password-12345");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.getByRole("link", { name: /Workspace Browser Test Firm/ }).click();
  await expect(page).toHaveURL(/\/workspace\/[^/]+\/dashboard$/);
  const firmId = new URL(page.url()).pathname.split("/")[2];
  if (!firmId) throw new Error("Expected a firm dashboard destination.");
  return firmId;
}

test("invitation acceptance stays busy until the firm dashboard opens", async ({
  page,
}) => {
  const firmId = await openFirm(page);
  await page.route("**/api/invitations/inspect", (route) =>
    route.fulfill({
      json: {
        data: {
          firmName: "Workspace Browser Test Firm",
          email: "admin@example.test",
          role: "admin",
          requiresSignIn: true,
        },
      },
    }),
  );
  await page.route("**/api/invitations/accept", (route) =>
    route.fulfill({
      json: { data: { firmId } },
    }),
  );
  await page.goto(`/accept-invitation#token=${"a".repeat(64)}`);
  await page
    .getByRole("button", { name: "Review invitation", exact: true })
    .click();
  const accept = page.getByRole("button", {
    name: "Accept using current session",
    exact: true,
  });
  await expect(accept).toBeVisible();
  await expect(page.getByText("Administrator", { exact: true })).toBeVisible();

  let release = () => {};
  let started = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const navigation = new Promise<void>((resolve) => {
    started = resolve;
  });
  await page.route(
    (url) => url.pathname === `/workspace/${firmId}/dashboard`,
    async (route) => {
      started();
      await gate;
      await route.continue();
    },
  );
  try {
    await accept.click();
    await navigation;
    await expect(accept).toBeDisabled();
    await expect(
      page.getByRole("button", { name: "Opening workspace…", exact: true }),
    ).toBeDisabled();
    await expect(page.getByRole("status")).toHaveText(
      "Opening your firm workspace…",
    );
    await expect(
      page.getByLabel("Current password", { exact: true }),
    ).toBeDisabled();
  } finally {
    release();
  }
  await expect(page).toHaveURL(new RegExp(`/workspace/${firmId}/dashboard$`));
  await expect(
    page.getByRole("heading", { name: "Dashboard", exact: true }),
  ).toBeVisible();
});

test("an empty company page preserves filters and offers a first-page recovery", async ({
  page,
}) => {
  const firmId = await openFirm(page);
  const name = "UX 6 pagination company";
  const created = await page.request.post(`/api/firms/${firmId}/companies`, {
    headers: { Origin: new URL(page.url()).origin },
    data: {
      name,
      cin: "",
      companyType: "Private company",
      address: "",
      contactEmail: "",
    },
  });
  expect(created.status()).toBe(201);
  const filters = new URLSearchParams({
    q: name,
    archived: "all",
    page: "999",
  });
  await page.goto(`/workspace/${firmId}/companies?${filters}`);
  await expect(
    page.getByRole("heading", {
      name: "No companies on this page",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "No companies yet", exact: true }),
  ).toHaveCount(0);
  const first = page.getByRole("link", { name: "First page", exact: true });
  const href = await first.getAttribute("href");
  if (!href) throw new Error("Expected a first-page recovery link.");
  const destination = new URL(href, page.url());
  expect(destination.searchParams.get("q")).toBe(name);
  expect(destination.searchParams.get("archived")).toBe("all");
  expect(destination.searchParams.get("page")).toBe("1");
  await first.click();
  await expect(
    page.getByRole("link", { name: new RegExp(name) }),
  ).toBeVisible();
});
