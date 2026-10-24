import "server-only";
import { randomUUID } from "node:crypto";
import { and, asc, count, desc, eq, gt, isNull } from "drizzle-orm";
import { appendAudit } from "@/modules/audit";
import { auditEvent } from "@/modules/audit/schema";
import { account, user } from "@/modules/identity/schema";
import type { QueryDatabase } from "@/platform/database/types";
import { ApplicationError } from "@/platform/http/errors";
import { firm, invitation, membership } from "../schema";
import type { TeamContext, TeamRepository } from "../team-contracts";
import {
  INVITATION_LIFETIME_MS,
  mayCreateInvitation,
  preservesAdministrator,
} from "../domain/team-policy";

const invalidInvite = () =>
  new ApplicationError(
    "NOT_FOUND",
    "This invitation is invalid, expired, cancelled or already used.",
  );
const invitationFields = {
  id: invitation.id,
  email: invitation.email,
  role: invitation.role,
  expiresAt: invitation.expiresAt,
  acceptedAt: invitation.acceptedAt,
  revokedAt: invitation.revokedAt,
  deliveryStatus: invitation.deliveryStatus,
};

// Every membership mutation takes the firm lock first, then rechecks the actor.
// This serializes last-admin decisions and invitation acceptance/cancellation.
async function lockFirm(db: QueryDatabase, firmId: string) {
  const [row] = await db
    .select()
    .from(firm)
    .where(eq(firm.id, firmId))
    .for("update");
  if (!row) throw new ApplicationError("NOT_FOUND", "Workspace was not found.");
  return row;
}
async function assertAdmin(db: QueryDatabase, context: TeamContext) {
  const [actor] = await db
    .select()
    .from(membership)
    .where(
      and(
        eq(membership.firmId, context.firmId),
        eq(membership.userId, context.userId),
        isNull(membership.revokedAt),
      ),
    );
  if (!actor || actor.role !== "admin")
    throw new ApplicationError(
      "FORBIDDEN",
      "Only current firm administrators can manage the team.",
    );
}
async function audit(
  db: QueryDatabase,
  context: TeamContext,
  action: string,
  resourceId: string,
) {
  await appendAudit(db, {
    firmId: context.firmId,
    actorId: context.userId,
    action,
    resourceType: "team",
    resourceId,
    requestId: context.requestId,
  });
}
async function activeInvitation(db: QueryDatabase, tokenHash: string) {
  const [row] = await db
    .select()
    .from(invitation)
    .where(
      and(
        eq(invitation.tokenHash, tokenHash),
        isNull(invitation.acceptedAt),
        isNull(invitation.revokedAt),
        gt(invitation.expiresAt, new Date()),
      ),
    );
  if (!row) throw invalidInvite();
  return row;
}

export function teamRepository(db: QueryDatabase): TeamRepository {
  return {
    async list(context, page) {
      return db.transaction(async (tx) => {
        await lockFirm(tx, context.firmId);
        await assertAdmin(tx, context);
        const rows = await tx
          .select({
            id: membership.id,
            userId: user.id,
            name: user.name,
            email: user.email,
            role: membership.role,
          })
          .from(membership)
          .innerJoin(user, eq(user.id, membership.userId))
          .where(
            and(
              eq(membership.firmId, context.firmId),
              isNull(membership.revokedAt),
            ),
          )
          .orderBy(asc(user.name), asc(membership.id))
          .limit(51)
          .offset((page - 1) * 50);
        const invitations = await tx
          .select(invitationFields)
          .from(invitation)
          .where(eq(invitation.firmId, context.firmId))
          .orderBy(desc(invitation.createdAt), desc(invitation.id))
          .limit(50);
        const activity = await tx
          .select({
            id: auditEvent.id,
            action: auditEvent.action,
            actorName: user.name,
            occurredAt: auditEvent.occurredAt,
          })
          .from(auditEvent)
          .leftJoin(user, eq(user.id, auditEvent.actorId))
          .where(
            and(
              eq(auditEvent.firmId, context.firmId),
              eq(auditEvent.resourceType, "team"),
            ),
          )
          .orderBy(desc(auditEvent.occurredAt), desc(auditEvent.id))
          .limit(50);
        return {
          members: rows.slice(0, 50),
          hasMore: rows.length > 50,
          invitations,
          activity,
        };
      });
    },
    async invite(context, input, tokenHash) {
      return db.transaction(async (tx) => {
        const targetFirm = await lockFirm(tx, context.firmId);
        await assertAdmin(tx, context);
        const [existing] = await tx
          .select({ id: membership.id })
          .from(membership)
          .innerJoin(user, eq(user.id, membership.userId))
          .where(
            and(
              eq(membership.firmId, context.firmId),
              eq(user.email, input.email),
              isNull(membership.revokedAt),
            ),
          );
        if (existing)
          throw new ApplicationError(
            "CONFLICT",
            "This email already belongs to a member of this firm.",
          );
        const [pending] = await tx
          .select({ id: invitation.id })
          .from(invitation)
          .where(
            and(
              eq(invitation.firmId, context.firmId),
              eq(invitation.email, input.email),
              isNull(invitation.revokedAt),
              isNull(invitation.acceptedAt),
              gt(invitation.expiresAt, new Date()),
            ),
          );
        if (pending)
          throw new ApplicationError(
            "CONFLICT",
            "A pending invitation already exists. Cancel it before inviting again.",
          );
        const [recent] = await tx
          .select({ total: count() })
          .from(invitation)
          .where(
            and(
              eq(invitation.firmId, context.firmId),
              gt(invitation.createdAt, new Date(Date.now() - 15 * 60 * 1000)),
            ),
          );
        const [daily] = await tx
          .select({ total: count() })
          .from(invitation)
          .where(
            and(
              eq(invitation.firmId, context.firmId),
              gt(
                invitation.createdAt,
                new Date(Date.now() - 24 * 60 * 60 * 1000),
              ),
            ),
          );
        if (!mayCreateInvitation(recent?.total ?? 0, daily?.total ?? 0))
          throw new ApplicationError(
            "RATE_LIMITED",
            "Invitation limit reached. Please try again later.",
          );
        const [created] = await tx
          .insert(invitation)
          .values({
            ...input,
            firmId: context.firmId,
            tokenHash,
            invitedBy: context.userId,
            expiresAt: new Date(Date.now() + INVITATION_LIFETIME_MS),
          })
          .returning({ id: invitation.id });
        await audit(tx, context, "team.invitation_created", created!.id);
        return { id: created!.id, firmName: targetFirm.name };
      });
    },
    async markDelivery(id, deliveryStatus) {
      await db
        .update(invitation)
        .set({ deliveryStatus })
        .where(eq(invitation.id, id));
    },
    async cancel(context, id) {
      await db.transaction(async (tx) => {
        await lockFirm(tx, context.firmId);
        await assertAdmin(tx, context);
        const [row] = await tx
          .update(invitation)
          .set({ revokedAt: new Date() })
          .where(
            and(
              eq(invitation.id, id),
              eq(invitation.firmId, context.firmId),
              isNull(invitation.acceptedAt),
              isNull(invitation.revokedAt),
            ),
          )
          .returning({ id: invitation.id });
        if (!row) throw invalidInvite();
        await audit(tx, context, "team.invitation_cancelled", id);
      });
    },
    async changeMember(context, id, role) {
      await db.transaction(async (tx) => {
        await lockFirm(tx, context.firmId);
        await assertAdmin(tx, context);
        const [target] = await tx
          .select()
          .from(membership)
          .where(
            and(
              eq(membership.firmId, context.firmId),
              eq(membership.id, id),
              isNull(membership.revokedAt),
            ),
          );
        if (!target)
          throw new ApplicationError("NOT_FOUND", "Member was not found.");
        if (target.role === "admin" && role !== "admin") {
          const [admins] = await tx
            .select({ total: count() })
            .from(membership)
            .where(
              and(
                eq(membership.firmId, context.firmId),
                eq(membership.role, "admin"),
                isNull(membership.revokedAt),
              ),
            );
          if (!preservesAdministrator(target.role, role, admins?.total ?? 0))
            throw new ApplicationError(
              "CONFLICT",
              "Keep at least one administrator in the firm.",
            );
        }
        if (role === target.role) return;
        if (role === null) {
          // Retain assignment/upload foreign keys and history; authorization excludes revoked rows.
          await tx
            .update(membership)
            .set({ revokedAt: new Date() })
            .where(eq(membership.id, id));
        } else
          await tx
            .update(membership)
            .set({ role })
            .where(eq(membership.id, id));
        await audit(
          tx,
          context,
          role === null ? "team.member_removed" : `team.role_changed.${role}`,
          target.userId,
        );
      });
    },
    async preview(tokenHash) {
      const row = await activeInvitation(db, tokenHash);
      const [targetFirm] = await db
        .select({ name: firm.name })
        .from(firm)
        .where(eq(firm.id, row.firmId));
      if (!targetFirm) throw invalidInvite();
      const [existing] = await db
        .select({ id: user.id })
        .from(user)
        .where(eq(user.email, row.email));
      return {
        firmName: targetFirm.name,
        email: row.email,
        role: row.role,
        requiresSignIn: !!existing,
      };
    },
    async accept(input) {
      const initial = await activeInvitation(db, input.tokenHash);
      return db.transaction(async (tx) => {
        await lockFirm(tx, initial.firmId);
        const row = await activeInvitation(tx, input.tokenHash);
        const [existing] = await tx
          .select()
          .from(user)
          .where(eq(user.email, row.email));
        let userId = existing?.id;
        if (existing) {
          if (input.userId !== existing.id)
            throw new ApplicationError(
              "FORBIDDEN",
              "Sign in with the invited email address before accepting this invitation.",
            );
        } else {
          if (input.userId)
            throw new ApplicationError(
              "FORBIDDEN",
              "Sign out before creating the invited account.",
            );
          if (!input.name || !input.passwordHash)
            throw new ApplicationError(
              "VALIDATION_ERROR",
              "Provide your name and a password of 12–128 characters.",
            );
          userId = randomUUID();
          await tx.insert(user).values({
            id: userId,
            name: input.name,
            email: row.email,
            emailVerified: true,
          });
          await tx.insert(account).values({
            id: randomUUID(),
            accountId: userId,
            providerId: "credential",
            userId,
            password: input.passwordHash,
          });
        }
        const [alreadyMember] = await tx
          .select()
          .from(membership)
          .where(
            and(
              eq(membership.firmId, row.firmId),
              eq(membership.userId, userId!),
            ),
          );
        if (!alreadyMember)
          await tx
            .insert(membership)
            .values({ firmId: row.firmId, userId: userId!, role: row.role });
        else if (alreadyMember.revokedAt)
          await tx
            .update(membership)
            .set({ revokedAt: null, role: row.role })
            .where(eq(membership.id, alreadyMember.id));
        await tx
          .update(invitation)
          .set({ acceptedAt: new Date() })
          .where(eq(invitation.id, row.id));
        await tx
          .update(user)
          .set({ emailVerified: true, updatedAt: new Date() })
          .where(eq(user.id, userId!));
        await audit(
          tx,
          {
            firmId: row.firmId,
            userId: userId!,
            role: row.role,
            requestId: input.requestId,
          },
          "team.invitation_accepted",
          row.id,
        );
        return { firmId: row.firmId };
      });
    },
  };
}
