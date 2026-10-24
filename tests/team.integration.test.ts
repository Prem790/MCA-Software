import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { createTestDatabase } from "./support/database";
import {
  teamRepository,
  teamService,
  invitationTokens,
  firmRepository,
  type Actor,
} from "@/modules/firms";
import { firm, invitation, membership } from "@/modules/firms/schema";
import { account, user } from "@/modules/identity/schema";
import { auditEvent } from "@/modules/audit/schema";
import type { InvitationDelivery } from "@/modules/firms/team-contracts";
import { company } from "@/modules/companies/schema";
import { task } from "@/modules/tasks/schema";

let database: Awaited<ReturnType<typeof createTestDatabase>>;
beforeAll(async () => {
  database = await createTestDatabase();
});
afterAll(async () => {
  await database?.client.close();
});

async function fixture() {
  const firmId = randomUUID();
  const userId = randomUUID();
  await database.db.insert(firm).values({ id: firmId, name: "Team test firm" });
  await database.db
    .insert(user)
    .values({ id: userId, name: "Admin", email: `${userId}@example.test` });
  await database.db
    .insert(membership)
    .values({ firmId, userId, role: "admin" });
  const actor: Actor = { firmId, userId, role: "admin" };
  const sent: Parameters<InvitationDelivery["send"]>[0][] = [];
  const send = vi.fn(
    async (input: Parameters<InvitationDelivery["send"]>[0]) => {
      sent.push(input);
    },
  );
  const repository = teamRepository(database.db);
  const hash = vi.fn(async () => "test-only-password-hash");
  const service = teamService(
    repository,
    { assertConfigured() {}, send },
    invitationTokens,
    hash,
  );
  const invite = async (email = `${randomUUID()}@example.test`) => {
    const result = await service.invite(
      actor,
      { email, role: "staff" },
      randomUUID(),
    );
    return { ...result, email, token: sent.at(-1)!.token };
  };
  return { actor, service, repository, sent, send, hash, invite };
}

it("stores only the token hash and atomically creates a credential account, membership and acceptance audit", async () => {
  const f = await fixture();
  const invite = await f.invite();
  const [stored] = await database.db
    .select()
    .from(invitation)
    .where(eq(invitation.id, invite.id));
  expect(stored!.tokenHash).toBe(invitationTokens.hash(invite.token));
  expect(stored!.tokenHash).not.toBe(invite.token);
  expect(await f.service.preview(invite.token)).toMatchObject({
    email: invite.email,
    requiresSignIn: false,
  });
  await f.service.accept(
    {
      token: invite.token,
      name: "Invited staff",
      password: "test-password-123456",
    },
    undefined,
    randomUUID(),
  );
  const [created] = await database.db
    .select()
    .from(user)
    .where(eq(user.email, invite.email));
  expect(created!.emailVerified).toBe(true);
  const [credential] = await database.db
    .select()
    .from(account)
    .where(eq(account.userId, created!.id));
  expect(credential!.password).toBe("test-only-password-hash");
  expect(
    await firmRepository(database.db).member(created!.id, f.actor.firmId),
  ).toMatchObject({ role: "staff" });
  const events = await database.db
    .select()
    .from(auditEvent)
    .where(eq(auditEvent.resourceId, invite.id));
  expect(events.map((event) => event.action)).toEqual(
    expect.arrayContaining([
      "team.invitation_created",
      "team.invitation_accepted",
    ]),
  );
  await expect(
    f.service.accept(
      { token: invite.token, name: "Replay", password: "test-password-123456" },
      undefined,
      randomUUID(),
    ),
  ).rejects.toMatchObject({ code: "NOT_FOUND" });
});

it("requires the existing account's session and never overwrites its credentials", async () => {
  const f = await fixture();
  const existingId = randomUUID();
  const email = `${existingId}@example.test`;
  await database.db
    .insert(user)
    .values({ id: existingId, name: "Existing", email });
  await database.db.insert(account).values({
    id: randomUUID(),
    userId: existingId,
    accountId: existingId,
    providerId: "credential",
    password: "existing-test-hash",
  });
  const invite = await f.invite(email);
  await expect(
    f.service.accept(
      { token: invite.token, password: "different-password-123" },
      undefined,
      randomUUID(),
    ),
  ).rejects.toMatchObject({ code: "FORBIDDEN" });
  await expect(
    f.service.accept({ token: invite.token }, f.actor.userId, randomUUID()),
  ).rejects.toMatchObject({ code: "FORBIDDEN" });
  await f.service.accept(
    { token: invite.token, password: "different-password-123" },
    existingId,
    randomUUID(),
  );
  const [credential] = await database.db
    .select()
    .from(account)
    .where(eq(account.userId, existingId));
  expect(credential!.password).toBe("existing-test-hash");
  expect(f.hash).not.toHaveBeenCalled();
});

it("rejects cancelled and expired links before password hashing", async () => {
  const f = await fixture();
  const cancelled = await f.invite();
  await f.service.cancel(f.actor, cancelled.id, randomUUID());
  await expect(f.service.preview(cancelled.token)).rejects.toMatchObject({
    code: "NOT_FOUND",
  });
  const expired = await f.invite();
  await database.db
    .update(invitation)
    .set({ expiresAt: new Date(0) })
    .where(eq(invitation.id, expired.id));
  await expect(
    f.service.accept(
      {
        token: expired.token,
        name: "Expired",
        password: "test-password-123456",
      },
      undefined,
      randomUUID(),
    ),
  ).rejects.toMatchObject({ code: "NOT_FOUND" });
  expect(f.hash).not.toHaveBeenCalled();
});

it("rejects non-admins, foreign-firm invitations, and stale administrator permissions", async () => {
  const a = await fixture();
  const b = await fixture();
  const invite = await b.invite();
  await expect(
    a.service.invite(
      { ...a.actor, role: "manager" },
      { email: "staff@example.test", role: "staff" },
      randomUUID(),
    ),
  ).rejects.toMatchObject({ code: "FORBIDDEN" });
  await expect(
    a.service.cancel(a.actor, invite.id, randomUUID()),
  ).rejects.toMatchObject({ code: "NOT_FOUND" });
  await database.db
    .update(membership)
    .set({ role: "staff" })
    .where(eq(membership.userId, a.actor.userId));
  await expect(a.service.list(a.actor, {})).rejects.toMatchObject({
    code: "FORBIDDEN",
  });
  await expect(a.invite()).rejects.toMatchObject({ code: "FORBIDDEN" });
});

it("protects the final administrator against demotion and removal", async () => {
  const f = await fixture();
  const [admin] = await database.db
    .select()
    .from(membership)
    .where(eq(membership.userId, f.actor.userId));
  await expect(
    f.service.changeRole(f.actor, admin!.id, { role: "staff" }, randomUUID()),
  ).rejects.toMatchObject({ code: "CONFLICT" });
  await expect(
    f.service.remove(f.actor, admin!.id, randomUUID()),
  ).rejects.toMatchObject({ code: "CONFLICT" });
});

it("revokes access while preserving historical assignments, then restores it only through a new accepted invitation", async () => {
  const f = await fixture();
  const invite = await f.invite();
  await f.service.accept(
    { token: invite.token, name: "Staff", password: "test-password-123456" },
    undefined,
    randomUUID(),
  );
  const [staff] = await database.db
    .select()
    .from(user)
    .where(eq(user.email, invite.email));
  const [member] = await database.db
    .select()
    .from(membership)
    .where(eq(membership.userId, staff!.id));
  const [record] = await database.db
    .insert(company)
    .values({ firmId: f.actor.firmId, name: "Assignment history" })
    .returning();
  await database.db.insert(task).values({
    firmId: f.actor.firmId,
    companyId: record!.id,
    assigneeId: staff!.id,
    title: "Retained assignment",
    dueDate: "2026-12-01",
  });
  await f.service.remove(f.actor, member!.id, randomUUID());
  expect(
    await firmRepository(database.db).member(staff!.id, f.actor.firmId),
  ).toBeUndefined();
  expect(await firmRepository(database.db).listForUser(staff!.id)).toEqual([]);
  expect(
    await database.db.select().from(task).where(eq(task.assigneeId, staff!.id)),
  ).toHaveLength(1);
  expect(
    (await f.service.list(f.actor, {})).members.map((row) => row.userId),
  ).not.toContain(staff!.id);
  const replacement = await f.invite(invite.email);
  await f.service.accept({ token: replacement.token }, staff!.id, randomUUID());
  expect(
    await firmRepository(database.db).member(staff!.id, f.actor.firmId),
  ).toMatchObject({ role: "staff" });
});

it("records email failures without returning a usable invitation token or pretending delivery succeeded", async () => {
  const f = await fixture();
  f.send.mockRejectedValueOnce(new Error("provider payload must stay private"));
  const email = `${randomUUID()}@example.test`;
  await expect(f.invite(email)).rejects.toMatchObject({
    code: "SERVICE_UNAVAILABLE",
  });
  const listing = await f.service.list(f.actor, {});
  expect(listing.invitations[0]).toMatchObject({
    email,
    deliveryStatus: "failed",
  });
  expect(listing.invitations[0]).not.toHaveProperty("tokenHash");
});

it("limits invitation creation including cancelled invitations and rejects duplicate pending invites", async () => {
  const f = await fixture();
  const first = await f.invite();
  await expect(f.invite(first.email)).rejects.toMatchObject({
    code: "CONFLICT",
  });
  await f.service.cancel(f.actor, first.id, randomUUID());
  for (let index = 0; index < 9; index++) await f.invite();
  await expect(f.invite()).rejects.toMatchObject({ code: "RATE_LIMITED" });
});
