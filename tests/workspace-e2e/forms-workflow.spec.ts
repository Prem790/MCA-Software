import { test, expect, type Page } from "@playwright/test";

async function signIn(page: Page) {
  await page.goto("/login");
  await page
    .getByLabel("Email address", { exact: true })
    .fill("admin@example.test");
  await page
    .getByLabel("Password", { exact: true })
    .fill("test-only-password-12345");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page
    .getByRole("link", {
      name: /Workspace Browser Test Firm.*Open firm dashboard/,
    })
    .click();
  await expect(page).toHaveURL(/\/dashboard$/);
  return new URL(page.url()).pathname.split("/")[2]!;
}

test("company form preserves failed entries and stays busy through create navigation", async ({
  page,
}) => {
  const firmId = await signIn(page);
  await page.goto(`/workspace/${firmId}/companies/new`);
  const form = page.getByRole("form", { name: "Create company", exact: true });
  const name = form.getByLabel("Company name", { exact: true });
  await name.fill("UX 4 Company Form Test");
  const endpoint = `**/api/firms/${firmId}/companies`;
  await page.route(endpoint, (route) =>
    route.fulfill({
      status: 409,
      contentType: "application/json",
      body: JSON.stringify({
        error: { message: "Test conflict: please retry." },
      }),
    }),
  );
  await form
    .getByRole("button", { name: "Create company", exact: true })
    .click();
  await expect(form.getByRole("alert")).toContainText("Test conflict");
  await expect(name).toHaveValue("UX 4 Company Form Test");
  await expect(name).toBeEnabled();
  await page.unroute(endpoint);
  let release = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  let beganNavigation = () => {};
  const navigating = new Promise<void>((resolve) => {
    beganNavigation = resolve;
  });
  await page.route(
    (url) =>
      new RegExp(`^/workspace/${firmId}/companies/[0-9a-f-]{36}$`).test(
        url.pathname,
      ),
    async (route) => {
      beganNavigation();
      await gate;
      await route.continue();
    },
  );
  try {
    const saved = page.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        response.url().endsWith(`/api/firms/${firmId}/companies`) &&
        response.status() === 201,
    );
    await form
      .getByRole("button", { name: "Create company", exact: true })
      .click();
    await saved;
    await navigating;
    await expect(
      form.getByRole("button", { name: "Saving…", exact: true }),
    ).toBeDisabled();
    await expect(name).toBeDisabled();
    await expect(form).toHaveAttribute("aria-busy", "true");
  } finally {
    release();
  }
  await expect(
    page.getByRole("heading", { name: "UX 4 Company Form Test", exact: true }),
  ).toBeVisible();
});

test("task checklist confirmation and comment retry preserve the saved workflow", async ({
  page,
}) => {
  const firmId = await signIn(page);
  const origin = new URL(page.url()).origin;
  const companyResponse = await page.request.post(
    `/api/firms/${firmId}/companies`,
    {
      headers: { Origin: origin },
      data: {
        name: "UX 4 Work Test Company",
        cin: "",
        companyType: "Private company",
        address: "",
        contactEmail: "",
      },
    },
  );
  expect(companyResponse.status()).toBe(201);
  const company = (await companyResponse.json()) as { data: { id: string } };
  const taskResponse = await page.request.post(`/api/firms/${firmId}/tasks`, {
    headers: { Origin: origin },
    data: {
      companyId: company.data.id,
      obligationId: null,
      title: "UX 4 Work Test",
      description: "Fictional test work",
      assigneeId: null,
      priority: "normal",
      dueDate: "2030-01-01",
    },
  });
  expect(taskResponse.status()).toBe(201);
  const task = (await taskResponse.json()) as { data: { id: string } };
  await page.goto(`/workspace/${firmId}/tasks/${task.data.id}`);
  await page
    .getByLabel("New checklist item", { exact: true })
    .fill("Check test evidence");
  await page.getByRole("button", { name: "Add item", exact: true }).click();
  await expect(
    page.getByRole("checkbox", { name: "Check test evidence", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", {
      name: "Remove checklist item Check test evidence",
      exact: true,
    })
    .click();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(
    page.getByRole("checkbox", { name: "Check test evidence", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", {
      name: "Remove checklist item Check test evidence",
      exact: true,
    })
    .click();
  await page
    .getByRole("button", { name: "Confirm remove", exact: true })
    .click();
  await expect(
    page.getByRole("checkbox", { name: "Check test evidence", exact: true }),
  ).toHaveCount(0);
  const comment = page.getByRole("form", {
    name: "Post task comment",
    exact: true,
  });
  await comment
    .getByLabel("Add a comment", { exact: true })
    .fill("UX 4 saved comment");
  const endpoint = `**/api/firms/${firmId}/tasks/${task.data.id}/comments`;
  await page.route(endpoint, (route) =>
    route.fulfill({
      status: 409,
      contentType: "application/json",
      body: JSON.stringify({ error: { message: "Test comment conflict." } }),
    }),
  );
  await comment
    .getByRole("button", { name: "Post comment", exact: true })
    .click();
  await expect(comment.getByRole("alert")).toContainText(
    "Test comment conflict",
  );
  await expect(
    comment.getByLabel("Add a comment", { exact: true }),
  ).toHaveValue("UX 4 saved comment");
  await page.unroute(endpoint);
  await comment
    .getByRole("button", { name: "Post comment", exact: true })
    .click();
  await expect(
    page
      .locator("#task-comments")
      .getByText("UX 4 saved comment", { exact: true }),
  ).toBeVisible();
  await expect(
    comment.getByLabel("Add a comment", { exact: true }),
  ).toHaveValue("");
});
