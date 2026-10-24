import { test, expect } from "../support/workspace-test";
import AxeBuilder from "@axe-core/playwright";

test("administrator persists company/director changes while staff remain read-only", async ({
  page,
  browser,
}) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Your practice.",
  );
  await page.getByRole("link", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(
    page.getByRole("button", { name: "Sign in", exact: true }),
  ).toBeEnabled();
  await page
    .getByLabel("Email address", { exact: true })
    .fill("admin@example.test");
  await page
    .getByLabel("Password", { exact: true })
    .fill("test-only-password-12345");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Choose your firm" }),
  ).toBeVisible();
  await page.getByRole("link", { name: /Workspace Browser Test Firm/ }).click();
  await expect(
    page.getByRole("heading", { name: "Dashboard", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Fictional preview", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("navigation", { name: "Firm navigation" })
    .getByRole("link", { name: "Companies", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "No active companies" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Add company", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Company name", exact: true })
    .fill("Cedar Working Test Company");
  await page
    .getByLabel("Contact email (optional)", { exact: true })
    .fill("company@example.test");
  await page
    .getByRole("button", { name: "Create company", exact: true })
    .click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Cedar Working Test Company",
  );
  const companyUrl = page.url();
  await page.reload();
  await expect(
    page.getByRole("textbox", { name: "Company name", exact: true }),
  ).toHaveValue("Cedar Working Test Company");
  await page
    .getByLabel("Address (optional)", { exact: true })
    .fill("Fictional browser test address");
  await page.getByRole("button", { name: "Save company", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText("Company details saved.");
  await page.getByText("Add a director", { exact: true }).click();
  const add = page.getByRole("form", { name: "Add director", exact: true });
  await add
    .getByRole("textbox", { name: "Director name", exact: true })
    .fill("Alex Test Person");
  await add.getByRole("button", { name: "Add director", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Alex Test Person", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Edit Alex Test Person", exact: true })
    .click();
  const edit = page.getByRole("form", {
    name: "Edit director Alex Test Person",
    exact: true,
  });
  await edit
    .getByLabel("Designation", { exact: true })
    .fill("Additional director");
  await edit
    .getByRole("button", { name: "Save director", exact: true })
    .click();
  await expect(
    page.getByText("Additional director · DIN not provided", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Address (optional)")).toHaveValue(
    "Fictional browser test address",
  );
  await expect(
    page.getByText("company director added", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("company updated", { exact: true }),
  ).toBeVisible();
  const desktopAxe = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(desktopAxe.violations).toEqual([]);
  await page.getByRole("heading", { level: 1 }).click();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({
    path: ".work/phase-2-company-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: ".work/phase-2-company-mobile.png",
    fullPage: true,
  });
  const mobileAxe = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(mobileAxe.violations).toEqual([]);
  const staffContext = await browser.newContext();
  const staff = await staffContext.newPage();
  await staff.goto("/login");
  await staff
    .getByLabel("Email address", { exact: true })
    .fill("staff@example.test");
  await staff
    .getByLabel("Password", { exact: true })
    .fill("test-only-password-12345");
  await staff.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(
    staff.getByRole("heading", { name: "Choose your firm" }),
  ).toBeVisible();
  await staff.goto(companyUrl);
  await expect(
    staff.getByText("Fictional browser test address", { exact: true }),
  ).toBeVisible();
  await expect(
    staff.getByRole("button", { name: "Save company", exact: true }),
  ).toHaveCount(0);
  const apiPath = new URL(companyUrl).pathname.replace(
    "/workspace/",
    "/api/firms/",
  );
  const denied = await staff.request.patch(apiPath, {
    data: {
      name: "Unauthorized edit",
      cin: "",
      companyType: "Other",
      contactEmail: "",
      address: "",
    },
    headers: { Origin: "http://127.0.0.1:3200" },
  });
  expect(denied.status()).toBe(403);
  await staffContext.close();
  await page
    .getByRole("button", { name: "Archive company", exact: true })
    .click();
  await page.getByRole("button", { name: "Confirm", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText(
    "This company is archived. Restore it before making changes.",
  );
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Save company", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Restore company", exact: true })
    .click();
  await page.getByRole("button", { name: "Confirm", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Save company", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Remove Alex Test Person", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Confirm removal", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Alex Test Person", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.goto(companyUrl);
  await expect(page).toHaveURL(/\/login$/);
});
