import { test, expect } from "../support/workspace-test";

test("password visibility preserves input and a rejected sign-in restores retry controls", async ({
  page,
}) => {
  await page.goto("/login");
  const email = page.getByLabel("Email address", { exact: true });
  const password = page.getByLabel("Password", { exact: true });
  await email.fill("admin@example.test");
  await password.fill("incorrect-test-password");
  await page
    .getByRole("button", { name: "Show password", exact: true })
    .click();
  await expect(password).toHaveAttribute("type", "text");
  await expect(password).toHaveValue("incorrect-test-password");
  await page
    .getByRole("button", { name: "Hide password", exact: true })
    .click();
  await expect(password).toHaveAttribute("type", "password");

  let release = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  let requests = 0;
  await page.route("**/api/auth/sign-in/email", async (route) => {
    requests += 1;
    await gate;
    await route.fulfill({
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({
        code: "INVALID_EMAIL_OR_PASSWORD",
        message: "Invalid email or password",
      }),
    });
  });
  try {
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Signing in…", exact: true }),
    ).toBeDisabled();
    await expect(email).toBeDisabled();
    await expect(password).toBeDisabled();
    await expect(
      page.getByRole("form", { name: "Sign in", exact: true }),
    ).toHaveAttribute("aria-busy", "true");
  } finally {
    release();
  }
  await expect(
    page.getByRole("form", { name: "Sign in", exact: true }).getByRole("alert"),
  ).toContainText("Sign-in failed");
  await expect(
    page.getByRole("button", { name: "Sign in", exact: true }),
  ).toBeEnabled();
  await expect(email).toBeEnabled();
  await expect(email).toHaveValue("admin@example.test");
  await expect(password).toHaveValue("incorrect-test-password");
  expect(requests).toBe(1);
});

test("successful sign-in stays busy while workspace navigation is pending", async ({
  page,
}) => {
  await page.goto("/login");
  await page
    .getByLabel("Email address", { exact: true })
    .fill("admin@example.test");
  await page
    .getByLabel("Password", { exact: true })
    .fill("test-only-password-12345");
  let release = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(
    (url) => url.pathname === "/workspace",
    async (route) => {
      await gate;
      await route.continue();
    },
  );
  try {
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Opening workspace…", exact: true }),
    ).toBeDisabled();
    await expect(
      page.getByRole("button", { name: "Sign in", exact: true }),
    ).toHaveCount(0);
    await expect(page.getByRole("status")).toHaveText(
      "Signed in. Opening your workspace…",
    );
    await expect(page.getByLabel("Password", { exact: true })).toBeDisabled();
  } finally {
    release();
  }
  await expect(page).toHaveURL(/\/workspace$/);
  await expect(
    page.getByRole("heading", { name: "Choose your firm" }),
  ).toBeVisible();
});
