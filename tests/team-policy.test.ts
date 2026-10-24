import { expect, it } from "vitest";
import {
  preservesAdministrator,
  mayCreateInvitation,
} from "@/modules/firms/domain/team-policy";
it("preserves an active administrator for both removal and demotion", () => {
  expect(preservesAdministrator("admin", null, 1)).toBe(false);
  expect(preservesAdministrator("admin", "manager", 1)).toBe(false);
  expect(preservesAdministrator("admin", "staff", 2)).toBe(true);
  expect(preservesAdministrator("admin", "admin", 1)).toBe(true);
  expect(preservesAdministrator("staff", null, 1)).toBe(true);
});
it("enforces both short-window and daily invitation budgets", () => {
  expect(mayCreateInvitation(9, 99)).toBe(true);
  expect(mayCreateInvitation(10, 20)).toBe(false);
  expect(mayCreateInvitation(2, 100)).toBe(false);
});
