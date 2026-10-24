import type { MemberRole } from "./access";

export const INVITATION_LIFETIME_MS = 72 * 60 * 60 * 1000;
export function invitationStatus(
  invitation: {
    acceptedAt: Date | null;
    revokedAt: Date | null;
    expiresAt: Date;
  },
  now: number,
) {
  if (invitation.acceptedAt) return "Accepted";
  if (invitation.revokedAt) return "Cancelled";
  return invitation.expiresAt.getTime() <= now ? "Expired" : "Pending";
}
export function preservesAdministrator(
  current: MemberRole,
  next: MemberRole | null,
  activeAdmins: number,
) {
  return current !== "admin" || next === "admin" || activeAdmins > 1;
}
export function mayCreateInvitation(recentCount: number, dailyCount: number) {
  return recentCount < 10 && dailyCount < 100;
}
