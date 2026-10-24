import { expect, it } from "vitest";
import {
  firmNavigation,
  navigationIsActive,
} from "@/features/workspace/navigation";
it("offers only implemented destinations for the selected firm and role", () => {
  const staff = firmNavigation("firm-one", "staff");
  expect(
    staff.some(
      (item) => item.label === "Team and access" || item.label === "Templates",
    ),
  ).toBe(false);
  const manager = firmNavigation("firm-one", "manager");
  expect(manager.some((item) => item.label === "Templates")).toBe(true);
  expect(manager.some((item) => item.label === "Team and access")).toBe(false);
  expect(
    firmNavigation("firm-one", "admin").some(
      (item) => item.label === "Team and access",
    ),
  ).toBe(true);
  expect(
    staff.every((item) => item.href.startsWith("/workspace/firm-one/")),
  ).toBe(true);
  expect(staff.some((item) => item.href.includes("preview"))).toBe(false);
});
it("marks nested records and both report screens active without matching other prefixes", () => {
  expect(
    navigationIsActive("/workspace/f/companies/record", {
      href: "/workspace/f/companies",
    }),
  ).toBe(true);
  expect(
    navigationIsActive("/workspace/f/companies-other", {
      href: "/workspace/f/companies",
    }),
  ).toBe(false);
  expect(
    navigationIsActive("/workspace/f/reports/obligations", {
      href: "/workspace/f/reports/tasks",
      activePrefix: "/workspace/f/reports",
    }),
  ).toBe(true);
});
