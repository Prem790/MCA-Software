import { afterAll, beforeAll, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { getAuth } from "@/platform/auth/server";
import { provisionAccount } from "@/modules/identity/infrastructure/provision";
import { verification } from "@/modules/identity/schema";
import { createTestDatabase } from "./support/database";

let database: Awaited<ReturnType<typeof createTestDatabase>>;
const sent = vi.hoisted(() => [] as { text: string }[]);
vi.mock("@/platform/database/client", () => ({
  getDatabase: () => database.db,
}));
vi.mock("@/platform/email/resend", () => ({
  sendEmail: async (message: { text: string }) => {
    sent.push(message);
  },
}));
const origin = "http://localhost:3000";
beforeAll(async () => {
  database = await createTestDatabase();
  vi.stubEnv("APP_MODE", "application");
  vi.stubEnv("APP_URL", origin);
  vi.stubEnv("DATABASE_URL", "postgresql://unused/test");
  vi.stubEnv(
    "BETTER_AUTH_SECRET",
    "test-only-secret-never-for-deployment-1234567890",
  );
  await provisionAccount(database.db, {
    name: "Recovery test",
    email: "recovery@example.test",
    password: "original-test-password-123",
    firmName: "Recovery firm",
  });
});
afterAll(async () => {
  await database?.client.close();
  vi.unstubAllEnvs();
});
function request(path: string, body: unknown) {
  return getAuth().handler(
    new Request(`${origin}/api/auth${path}`, {
      method: "POST",
      headers: {
        Origin: origin,
        "Content-Type": "application/json",
        "X-Forwarded-For": "127.0.0.1",
      },
      body: JSON.stringify(body),
    }),
  );
}
function tokenFromLastMail() {
  const link = sent.at(-1)!.text.match(/http[^\s]+/)![0];
  return new URLSearchParams(new URL(link).hash.slice(1)).get("token")!;
}

it("returns the same success response for unknown addresses without sending email", async () => {
  const before = sent.length;
  const unknown = await request("/request-password-reset", {
    email: "unknown@example.test",
    redirectTo: `${origin}/reset-password`,
  });
  expect(unknown.status).toBe(200);
  expect(sent).toHaveLength(before);
  const known = await request("/request-password-reset", {
    email: "recovery@example.test",
    redirectTo: `${origin}/reset-password`,
  });
  expect(known.status).toBe(200);
  expect(await unknown.json()).toEqual(await known.json());
});

it("changes the password once, rejects reuse, and revokes the old session", async () => {
  const signedIn = await request("/sign-in/email", {
    email: "recovery@example.test",
    password: "original-test-password-123",
  });
  expect(signedIn.status).toBe(200);
  const cookie = signedIn.headers
    .getSetCookie()
    .map((value) => value.split(";")[0])
    .join("; ");
  await request("/request-password-reset", { email: "recovery@example.test" });
  const token = tokenFromLastMail();
  const changed = await request("/reset-password", {
    token,
    newPassword: "replacement-test-password-456",
  });
  expect(changed.status).toBe(200);
  expect(
    (
      await request("/reset-password", {
        token,
        newPassword: "another-test-password-789",
      })
    ).status,
  ).toBe(400);
  const session = await getAuth().handler(
    new Request(`${origin}/api/auth/get-session`, {
      headers: { Cookie: cookie },
    }),
  );
  expect(await session.json()).toBeNull();
  expect(
    (
      await request("/sign-in/email", {
        email: "recovery@example.test",
        password: "replacement-test-password-456",
      })
    ).status,
  ).toBe(200);
});

it("rejects expired reset tokens", async () => {
  // Direct server API avoids the HTTP mail-request limiter in this expiry-specific test.
  await getAuth().api.requestPasswordReset({
    body: { email: "recovery@example.test" },
  });
  const token = tokenFromLastMail();
  await database.db
    .update(verification)
    .set({ expiresAt: new Date(0) })
    .where(eq(verification.identifier, `reset-password:${token}`));
  expect(
    (
      await request("/reset-password", {
        token,
        newPassword: "replacement-test-password-789",
      })
    ).status,
  ).toBe(400);
});
