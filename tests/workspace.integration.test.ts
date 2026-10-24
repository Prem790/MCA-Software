import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { getAuth } from "@/platform/auth/server";
import { provisionAccount } from "@/modules/identity/infrastructure/provision";
import {
  membership,
  firm,
  user,
  auditEvent,
  company,
  director,
  companyDirector,
  invitation,
} from "@/platform/database/schema";
import { GET as listFirms } from "@/app/api/firms/route";
import {
  GET as listCompanies,
  POST as createCompany,
} from "@/app/api/firms/[firmId]/companies/route";
import {
  GET as detail,
  PATCH as update,
  DELETE as archive,
} from "@/app/api/firms/[firmId]/companies/[companyId]/route";
import { POST as restore } from "@/app/api/firms/[firmId]/companies/[companyId]/restore/route";
import { POST as addDirector } from "@/app/api/firms/[firmId]/companies/[companyId]/directors/route";
import {
  PATCH as updateDirector,
  DELETE as removeDirector,
} from "@/app/api/firms/[firmId]/companies/[companyId]/directors/[associationId]/route";
import { GET as activity } from "@/app/api/firms/[firmId]/companies/[companyId]/activity/route";
import { createTestDatabase } from "./support/database";
import { GET as listTeam } from "@/app/api/firms/[firmId]/team/route";
import { PATCH as changeRole } from "@/app/api/firms/[firmId]/team/[membershipId]/route";
import { POST as inspectInvitation } from "@/app/api/invitations/inspect/route";
import { invitationTokens } from "@/modules/firms";

let database: Awaited<ReturnType<typeof createTestDatabase>>;
vi.mock("@/platform/database/client", () => ({
  getDatabase: () => database.db,
}));
const password = "test-only-password-12345";
const origin = "http://localhost:3000";
let firmId: string,
  otherFirmId: string,
  companyId: string,
  otherCompanyId: string;
const cookies: Record<string, string> = {};
const fields = {
  name: "Workspace Test Company",
  cin: "",
  companyType: "Private company",
  address: "Fictional address",
  contactEmail: "company@example.test",
};
function context(id = companyId, targetFirm = firmId) {
  return { params: Promise.resolve({ firmId: targetFirm, companyId: id }) };
}
function request(
  method = "GET",
  actor = "admin",
  body?: unknown,
  extra: Record<string, string> = {},
) {
  return new Request(`${origin}/api/firms`, {
    method,
    headers: {
      Origin: origin,
      Cookie: cookies[actor] ?? "",
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...extra,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}
async function data(response: Response) {
  return (await response.json()).data;
}
beforeAll(async () => {
  vi.stubEnv("APP_MODE", "application");
  vi.stubEnv("APP_URL", origin);
  vi.stubEnv("DATABASE_URL", "postgresql://unused/test");
  vi.stubEnv(
    "BETTER_AUTH_SECRET",
    "test-only-secret-never-for-deployment-1234567890",
  );
  database = await createTestDatabase();
  const first = await provisionAccount(database.db, {
    name: "Test Admin",
    email: "admin@example.test",
    password,
    firmName: "First test firm",
  });
  firmId = first.firmId;
  const second = await provisionAccount(database.db, {
    name: "Other Admin",
    email: "other@example.test",
    password,
    firmName: "Other test firm",
  });
  otherFirmId = second.firmId;
  for (const role of ["staff", "manager"] as const)
    await provisionAccount(database.db, {
      name: `Test ${role}`,
      email: `${role}@example.test`,
      password,
      firmId,
      role,
    });
  for (const actor of ["admin", "other", "staff", "manager"]) {
    const response = await getAuth().handler(
      new Request(`${origin}/api/auth/sign-in/email`, {
        method: "POST",
        headers: {
          Origin: origin,
          "Content-Type": "application/json",
          "x-forwarded-for": `192.0.2.${["admin", "other", "staff", "manager"].indexOf(actor) + 1}`,
        },
        body: JSON.stringify({ email: `${actor}@example.test`, password }),
      }),
    );
    expect(response.status).toBe(200);
    cookies[actor] = response.headers
      .getSetCookie()
      .map((value) => value.split(";")[0])
      .join("; ");
  }
  const response = await createCompany(
    request("POST", "admin", fields),
    context(),
  );
  expect(response.status).toBe(201);
  companyId = (await data(response)).id;
  const other = await createCompany(
    request("POST", "other", { ...fields, name: "Other firm secret company" }),
    context(undefined, otherFirmId),
  );
  otherCompanyId = (await data(other)).id;
});
afterAll(async () => {
  await database?.client.close();
  vi.unstubAllEnvs();
});

describe("authenticated company workspace", () => {
  it("protects public invitation inspection with origin, body and shared token limits", async () => {
    const token = invitationTokens.create();
    const [admin] = await database.db
      .select()
      .from(user)
      .where(eq(user.email, "admin@example.test"));
    await database.db.insert(invitation).values({
      firmId,
      email: "invited-http@example.test",
      role: "staff",
      tokenHash: token.hash,
      invitedBy: admin!.id,
      expiresAt: new Date(Date.now() + 60000),
    });
    expect(
      (
        await inspectInvitation(
          request(
            "POST",
            "anonymous",
            { token: token.raw },
            { Origin: "https://attacker.example.test" },
          ),
        )
      ).status,
    ).toBe(403);
    expect(
      (
        await inspectInvitation(
          request("POST", "anonymous", { token: "invalid" }),
        )
      ).status,
    ).toBe(400);
    for (let index = 0; index < 10; index++) {
      const response = await inspectInvitation(
        request("POST", "anonymous", { token: token.raw }),
      );
      expect(response.status).toBe(200);
      expect(await data(response)).toMatchObject({
        requiresSignIn: false,
        email: "invited-http@example.test",
      });
    }
    expect(
      (
        await inspectInvitation(
          request("POST", "anonymous", { token: token.raw }),
        )
      ).status,
    ).toBe(429);
  });
  it("restricts team APIs to current administrators and rejects forged roles and cross-origin changes", async () => {
    expect((await listTeam(request(), context())).status).toBe(200);
    expect((await listTeam(request("GET", "manager"), context())).status).toBe(
      403,
    );
    expect((await listTeam(request("GET", "staff"), context())).status).toBe(
      403,
    );
    expect(
      (await listTeam(request("GET", "anonymous"), context())).status,
    ).toBe(401);
    expect(
      (await listTeam(request(), context(undefined, otherFirmId))).status,
    ).toBe(404);
    const [admin] = await database.db
      .select()
      .from(user)
      .where(eq(user.email, "admin@example.test"));
    const [member] = await database.db
      .select()
      .from(membership)
      .where(eq(membership.userId, admin!.id));
    const teamContext = {
      params: Promise.resolve({ firmId, membershipId: member!.id }),
    };
    expect(
      (
        await changeRole(
          request("PATCH", "admin", { role: "owner" }),
          teamContext,
        )
      ).status,
    ).toBe(400);
    expect(
      (
        await changeRole(
          request(
            "PATCH",
            "admin",
            { role: "staff" },
            { Origin: "https://attacker.example.test" },
          ),
          teamContext,
        )
      ).status,
    ).toBe(403);
    expect(
      (
        await changeRole(
          request("PATCH", "admin", { role: "staff" }),
          teamContext,
        )
      ).status,
    ).toBe(409);
  });
  it("requires a real session and lists only current memberships", async () => {
    expect(
      (await listCompanies(request("GET", "anonymous"), context())).status,
    ).toBe(401);
    expect(await data(await listFirms(request()))).toEqual([
      { id: firmId, name: "First test firm", role: "admin" },
    ]);
  });
  it("persists creation, update and audit events atomically", async () => {
    const response = await update(
      request("PATCH", "admin", { ...fields, name: "Renamed company" }),
      context(),
    );
    expect(response.status).toBe(200);
    expect(await data(await detail(request(), context()))).toMatchObject({
      company: { id: companyId, name: "Renamed company" },
    });
    const events = await data(await activity(request(), context()));
    expect(events.map((event: { action: string }) => event.action)).toContain(
      "company.created",
    );
    expect(events.map((event: { action: string }) => event.action)).toContain(
      "company.updated",
    );
  });
  it("denies cross-firm listing, reads, writes, history and director creation", async () => {
    expect(
      (await listCompanies(request(), context(undefined, otherFirmId))).status,
    ).toBe(404);
    expect((await detail(request(), context(otherCompanyId))).status).toBe(404);
    expect(
      (await update(request("PATCH", "admin", fields), context(otherCompanyId)))
        .status,
    ).toBe(404);
    expect(
      (await archive(request("DELETE"), context(otherCompanyId))).status,
    ).toBe(404);
    expect((await activity(request(), context(otherCompanyId))).status).toBe(
      404,
    );
    expect(
      (
        await addDirector(
          request("POST", "admin", {
            name: "Sample person",
            din: "",
            designation: "Director",
          }),
          context(otherCompanyId),
        )
      ).status,
    ).toBe(404);
  });
  it("gives staff read access while denying every write action", async () => {
    expect((await detail(request("GET", "staff"), context())).status).toBe(200);
    expect(
      (await createCompany(request("POST", "staff", fields), context())).status,
    ).toBe(403);
    expect(
      (await update(request("PATCH", "staff", fields), context())).status,
    ).toBe(403);
    expect((await archive(request("DELETE", "staff"), context())).status).toBe(
      403,
    );
    expect((await restore(request("POST", "staff"), context())).status).toBe(
      403,
    );
    expect(
      (
        await addDirector(
          request("POST", "staff", {
            name: "Sample person",
            din: "",
            designation: "Director",
          }),
          context(),
        )
      ).status,
    ).toBe(403);
  });
  it("allows managers to create records", async () => {
    expect(
      (
        await createCompany(
          request("POST", "manager", {
            ...fields,
            name: "Manager-created company",
          }),
          context(),
        )
      ).status,
    ).toBe(201);
  });
  it("rejects cross-origin writes, invalid JSON, oversized bodies and forged scope", async () => {
    expect(
      (
        await update(
          request("PATCH", "admin", fields, {
            Origin: "https://attacker.example.test",
          }),
          context(),
        )
      ).status,
    ).toBe(403);
    expect(
      (
        await update(
          request("PATCH", "admin", fields, { "Sec-Fetch-Site": "cross-site" }),
          context(),
        )
      ).status,
    ).toBe(403);
    const malformed = new Request(origin, {
      method: "POST",
      headers: {
        Cookie: cookies.admin!,
        Origin: origin,
        "Content-Type": "application/json",
      },
      body: "{",
    });
    expect((await createCompany(malformed, context())).status).toBe(400);
    expect(
      (
        await createCompany(
          request("POST", "admin", { ...fields, address: "x".repeat(18000) }),
          context(),
        )
      ).status,
    ).toBe(400);
    expect(
      (
        await createCompany(
          request("POST", "admin", {
            ...fields,
            firmId: otherFirmId,
            role: "admin",
          }),
          context(),
        )
      ).status,
    ).toBe(400);
  });
  it("rolls back duplicate identifiers without a partial record or audit event", async () => {
    const duplicate = {
      ...fields,
      name: "Identifier test only",
      cin: "A".repeat(21),
    };
    expect(
      (await createCompany(request("POST", "admin", duplicate), context()))
        .status,
    ).toBe(201);
    const before = await database.db.select().from(auditEvent);
    const response = await createCompany(
      request("POST", "admin", duplicate),
      context(),
    );
    expect(response.status).toBe(409);
    expect(await response.text()).not.toContain("unique constraint");
    expect(await database.db.select().from(auditEvent)).toHaveLength(
      before.length,
    );
    expect(
      await database.db
        .select()
        .from(company)
        .where(eq(company.cin, duplicate.cin)),
    ).toHaveLength(1);
  });
  it("creates, updates and removes director associations and checks their scope", async () => {
    const created = await addDirector(
      request("POST", "admin", {
        name: "Fictional Person",
        din: "",
        designation: "Director",
      }),
      context(),
    );
    expect(created.status).toBe(201);
    const person = await data(created);
    const ctx = {
      params: Promise.resolve({ firmId, companyId, associationId: person.id }),
    };
    expect(
      (
        await updateDirector(
          request("PATCH", "staff", {
            name: "Denied",
            din: "",
            designation: "Director",
          }),
          ctx,
        )
      ).status,
    ).toBe(403);
    expect((await removeDirector(request("DELETE", "staff"), ctx)).status).toBe(
      403,
    );
    const foreign = {
      params: Promise.resolve({
        firmId,
        companyId: otherCompanyId,
        associationId: person.id,
      }),
    };
    expect((await removeDirector(request("DELETE"), foreign)).status).toBe(404);
    expect(
      (
        await updateDirector(
          request("PATCH", "admin", {
            name: "Updated Person",
            din: "",
            designation: "Officer",
          }),
          ctx,
        )
      ).status,
    ).toBe(200);
    expect(
      (await data(await detail(request(), context()))).directors,
    ).toMatchObject([{ name: "Updated Person", designation: "Officer" }]);
    expect((await removeDirector(request("DELETE"), ctx)).status).toBe(200);
    expect(
      await database.db
        .select()
        .from(companyDirector)
        .where(eq(companyDirector.id, person.id)),
    ).toHaveLength(0);
    expect(
      await database.db
        .select()
        .from(director)
        .where(eq(director.id, person.directorId)),
    ).toHaveLength(1);
  });
  it("archives without deleting and restores before allowing edits", async () => {
    expect((await archive(request("DELETE"), context())).status).toBe(200);
    const active = await data(await listCompanies(request(), context()));
    expect(
      active.items.some((row: { id: string }) => row.id === companyId),
    ).toBe(false);
    expect((await detail(request(), context())).status).toBe(200);
    expect(
      (await update(request("PATCH", "admin", fields), context())).status,
    ).toBe(404);
    expect(
      (
        await addDirector(
          request("POST", "admin", {
            name: "Blocked",
            din: "",
            designation: "Director",
          }),
          context(),
        )
      ).status,
    ).toBe(404);
    const archivedEvents = await database.db.select().from(auditEvent);
    await archive(request("DELETE"), context());
    expect(await database.db.select().from(auditEvent)).toHaveLength(
      archivedEvents.length,
    );
    expect((await restore(request("POST"), context())).status).toBe(200);
    expect(
      (await update(request("PATCH", "admin", fields), context())).status,
    ).toBe(200);
  });
  it("supports literal searches, bounded pagination and never leaks another firm", async () => {
    const response = await listCompanies(
      new Request(`${origin}/api/firms?q=%25`, {
        headers: { Cookie: cookies.admin! },
      }),
      context(),
    );
    expect((await data(response)).total).toBe(0);
    const all = await data(await listCompanies(request(), context()));
    expect(all.items).toHaveLength(3);
    expect(JSON.stringify(all)).not.toContain("Other firm secret company");
    expect(
      (
        await listCompanies(
          new Request(`${origin}/api/firms?page=0`, {
            headers: { Cookie: cookies.admin! },
          }),
          context(),
        )
      ).status,
    ).toBe(400);
  });
  it("rechecks membership after revocation even with a valid session", async () => {
    const [staff] = await database.db
      .select()
      .from(user)
      .where(eq(user.email, "staff@example.test"));
    await database.db
      .delete(membership)
      .where(eq(membership.userId, staff!.id));
    expect(
      (await listCompanies(request("GET", "staff"), context())).status,
    ).toBe(404);
  });
  it("rolls back provisioning failures instead of leaving an empty firm", async () => {
    const before = await database.db.select().from(auditEvent);
    await expect(
      provisionAccount(database.db, {
        name: "Duplicate",
        email: "ADMIN@example.test",
        password,
        firmName: "Must not persist",
      }),
    ).rejects.toThrow();
    expect(await database.db.select().from(auditEvent)).toHaveLength(
      before.length,
    );
    expect(
      await database.db
        .select()
        .from(firm)
        .where(eq(firm.name, "Must not persist")),
    ).toHaveLength(0);
  });
});
