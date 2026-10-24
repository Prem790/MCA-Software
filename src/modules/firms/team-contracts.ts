import { z } from "zod";
import type { Actor, MemberRole } from "./domain/access";

export const roleInput = z
  .object({ role: z.enum(["admin", "manager", "staff"]) })
  .strict();
export const invitationInput = roleInput.extend({
  email: z
    .email()
    .max(254)
    .transform((value) => value.toLowerCase()),
});
export const invitationToken = z.string().regex(/^[a-f0-9]{64}$/);
export const acceptInvitationInput = z
  .object({
    token: invitationToken,
    name: z.string().trim().min(2).max(200).optional(),
    password: z.string().min(12).max(128).optional(),
  })
  .strict();
export const teamQuery = z.object({
  page: z.coerce.number().int().min(1).max(1000).default(1),
});
export type TeamContext = Actor & { requestId: string };
export type InvitationView = {
  id: string;
  email: string;
  role: MemberRole;
  expiresAt: Date;
  acceptedAt: Date | null;
  revokedAt: Date | null;
  deliveryStatus: "pending" | "submitted" | "failed";
};
export type InvitationPreview = {
  firmName: string;
  email: string;
  role: MemberRole;
  requiresSignIn: boolean;
};
export type TeamMember = {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: MemberRole;
};
export type TeamActivity = {
  id: string;
  action: string;
  actorName: string | null;
  occurredAt: Date;
};
export interface TeamRepository {
  list(
    context: TeamContext,
    page: number,
  ): Promise<{
    members: TeamMember[];
    hasMore: boolean;
    invitations: InvitationView[];
    activity: TeamActivity[];
  }>;
  invite(
    context: TeamContext,
    input: z.infer<typeof invitationInput>,
    tokenHash: string,
  ): Promise<{ id: string; firmName: string }>;
  markDelivery(id: string, status: "submitted" | "failed"): Promise<void>;
  cancel(context: TeamContext, id: string): Promise<void>;
  changeMember(
    context: TeamContext,
    id: string,
    role: MemberRole | null,
  ): Promise<void>;
  preview(tokenHash: string): Promise<InvitationPreview>;
  accept(input: {
    tokenHash: string;
    userId?: string;
    name?: string;
    passwordHash?: string;
    requestId: string;
  }): Promise<{ firmId: string }>;
}
export interface InvitationDelivery {
  assertConfigured(): void;
  send(input: {
    id: string;
    email: string;
    firmName: string;
    role: MemberRole;
    token: string;
  }): Promise<void>;
}
