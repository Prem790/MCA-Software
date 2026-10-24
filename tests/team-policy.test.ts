import { expect, it } from "vitest";
import {
  preservesAdministrator,
  mayCreateInvitation,
  invitationStatus,
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
it("expires invitations at the deadline and preserves accepted/cancelled status", () => {
  const expiresAt = new Date("2026-10-24T12:00:00.000Z");
  const invitation = { expiresAt, acceptedAt: null, revokedAt: null };
  const deadline = expiresAt.getTime();
  expect(invitationStatus(invitation, deadline - 1)).toBe("Pending");
  expect(invitationStatus(invitation, deadline)).toBe("Expired");
  expect(invitationStatus(invitation, deadline + 1)).toBe("Expired");
  expect(
    invitationStatus({ ...invitation, acceptedAt: expiresAt }, deadline + 1),
  ).toBe("Accepted");
  expect(
    invitationStatus({ ...invitation, revokedAt: expiresAt }, deadline + 1),
  ).toBe("Cancelled");
  expect(
    invitationStatus(
      { ...invitation, acceptedAt: expiresAt, revokedAt: expiresAt },
      deadline + 1,
    ),
  ).toBe("Accepted");
});
