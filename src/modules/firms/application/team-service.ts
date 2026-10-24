import { ApplicationError } from "@/platform/http/errors";
import type { Actor } from "../domain/access";
import { invitationStatus } from "../domain/team-policy";
import {
  acceptInvitationInput,
  invitationInput,
  invitationToken,
  roleInput,
  teamQuery,
  type InvitationDelivery,
  type TeamRepository,
} from "../team-contracts";

export function teamService(
  repository: TeamRepository,
  delivery: InvitationDelivery,
  tokens: {
    create(): { raw: string; hash: string };
    hash(raw: string): string;
  },
  hashPassword: (password: string) => Promise<string>,
) {
  const admin = (actor: Actor, requestId: string) => {
    if (actor.role !== "admin")
      throw new ApplicationError(
        "FORBIDDEN",
        "Only firm administrators can manage the team.",
      );
    return { ...actor, requestId };
  };
  return {
    async list(actor: Actor, query: unknown) {
      const data = await repository.list(
        admin(actor, "read"),
        teamQuery.parse(query).page,
      );
      const now = Date.now();
      return {
        ...data,
        invitations: data.invitations.map((invitation) => ({
          ...invitation,
          status: invitationStatus(invitation, now),
        })),
      };
    },
    async invite(actor: Actor, input: unknown, requestId: string) {
      const context = admin(actor, requestId);
      const parsed = invitationInput.parse(input);
      delivery.assertConfigured();
      const token = tokens.create();
      const invite = await repository.invite(context, parsed, token.hash);
      try {
        await delivery.send({ ...invite, ...parsed, token: token.raw });
      } catch {
        await repository.markDelivery(invite.id, "failed");
        throw new ApplicationError(
          "SERVICE_UNAVAILABLE",
          "Email delivery could not be confirmed. Cancel the pending invitation and invite again to retry.",
        );
      }
      await repository.markDelivery(invite.id, "submitted");
      return { id: invite.id };
    },
    cancel(actor: Actor, id: string, requestId: string) {
      return repository.cancel(admin(actor, requestId), id);
    },
    changeRole(actor: Actor, id: string, input: unknown, requestId: string) {
      return repository.changeMember(
        admin(actor, requestId),
        id,
        roleInput.parse(input).role,
      );
    },
    remove(actor: Actor, id: string, requestId: string) {
      return repository.changeMember(admin(actor, requestId), id, null);
    },
    preview(input: unknown) {
      return repository.preview(tokens.hash(invitationToken.parse(input)));
    },
    async accept(
      input: unknown,
      userId: string | undefined,
      requestId: string,
    ) {
      const parsed = acceptInvitationInput.parse(input);
      const tokenHash = tokens.hash(parsed.token);
      const preview = await repository.preview(tokenHash);
      return repository.accept({
        tokenHash,
        userId,
        name: parsed.name,
        requestId,
        passwordHash:
          !preview.requiresSignIn && parsed.password
            ? await hashPassword(parsed.password)
            : undefined,
      });
    },
  };
}
