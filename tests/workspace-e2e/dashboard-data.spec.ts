import { test, expect } from "@playwright/test";

test("dashboard drill-down retains company scope and renders saved task labels and dates", async ({
  page,
}) => {
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
  const dashboard = page.url();
  const firmId = new URL(dashboard).pathname.split("/")[2]!;
  const origin = new URL(dashboard).origin;
  const companyResponse = await page.request.post(
    `/api/firms/${firmId}/companies`,
    {
      headers: { Origin: origin },
      data: {
        name: "UX 3 Scoped Test Company",
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
      title: "UX 3 Saved Test Task",
      description: "Disposable browser test work",
      assigneeId: null,
      priority: "urgent",
      dueDate: "2030-01-01",
    },
  });
  expect(taskResponse.status()).toBe(201);
  await page.reload();
  await page
    .getByLabel("Company", { exact: true })
    .selectOption(company.data.id);
  await page
    .getByRole("button", { name: "Apply company", exact: true })
    .click();
  await expect(page).toHaveURL(new RegExp(`companyId=${company.data.id}`));
  const metrics = page.getByRole("region", {
    name: "Task overview",
    exact: true,
  });
  const allTasks = metrics.getByRole("link", { name: /All tasks/ });
  await expect(allTasks).toContainText("1");
  await expect(allTasks).toHaveAttribute(
    "href",
    new RegExp(`companyId=${company.data.id}`),
  );
  await allTasks.click();
  await expect(page).toHaveURL(
    new RegExp(`/reports/tasks\\?companyId=${company.data.id}`),
  );
  const row = page.getByRole("row").filter({ hasText: "UX 3 Saved Test Task" });
  await expect(row).toContainText("Urgent");
  await expect(row).toContainText("Not started");
  await expect(row).toContainText("1 Jan 2030");
  await expect(
    page.getByRole("navigation", { name: "Report pages", exact: true }),
  ).toContainText("1 of 1 record");
  await page.setViewportSize({ width: 390, height: 844 });
  const tableRegion = page.getByRole("region", {
    name: "Report records table",
    exact: true,
  });
  await expect(tableRegion).toHaveAttribute("tabindex", "0");
  await tableRegion.focus();
  await expect(tableRegion).toBeFocused();
});
