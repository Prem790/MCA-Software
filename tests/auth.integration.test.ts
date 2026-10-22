import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { hashPassword } from "better-auth/crypto";
import { getAuth } from "@/platform/auth/server";
import { user, account } from "@/modules/identity/schema";
import { createTestDatabase } from "./support/database";

let database: Awaited<ReturnType<typeof createTestDatabase>>;
vi.mock("@/platform/database/client", () => ({
  getDatabase: () => database.db,
}));

beforeAll(async () => {
  vi.stubEnv("APP_MODE", "application");
  vi.stubEnv("APP_URL", "http://localhost:3000");
  vi.stubEnv("DATABASE_URL", "postgresql://unused/test");
  vi.stubEnv(
    "BETTER_AUTH_SECRET",
    "test-only-secret-never-for-deployment-1234567890",
  );
  database = await createTestDatabase();
  await database.db.insert(user).values({
    id: "auth-test",
    name: "Test",
    email: "auth@example.test",
    emailVerified: true,
  });
  await database.db.insert(account).values({
    id: "credential-test",
    accountId: "auth-test",
    providerId: "credential",
    userId: "auth-test",
    password: await hashPassword("test-only-password-12345"),
  });
});
afterAll(async () => {
  await database?.client.close();
  vi.unstubAllEnvs();
});

function signIn(password: string) {
  return getAuth().handler(
    new Request("http://localhost:3000/api/auth/sign-in/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "http://localhost:3000",
      },
      body: JSON.stringify({ email: "auth@example.test", password }),
    }),
  );
}

describe("Better Auth against migrated PostgreSQL", () => {
  it("signs in a provisioned user and resolves the session", async () => {
    const response = await signIn("test-only-password-12345");
    expect(response.status).toBe(200);
    const cookie = response.headers.get("set-cookie");
    expect(cookie).toContain("HttpOnly");
    const sessionResponse = await getAuth().handler(
      new Request("http://localhost:3000/api/auth/get-session", {
        headers: { Cookie: cookie! },
      }),
    );
    expect(sessionResponse.status).toBe(200);
    expect(await sessionResponse.json()).toMatchObject({
      user: { id: "auth-test" },
    });
  });

  it("rejects incorrect passwords", async () => {
    expect((await signIn("incorrect-password")).status).toBe(401);
  });

  it("does not allow public account creation", async () => {
    const response = await getAuth().handler(
      new Request("http://localhost:3000/api/auth/sign-up/email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: "http://localhost:3000",
        },
        body: JSON.stringify({
          name: "Uninvited",
          email: "uninvited@example.test",
          password: "test-only-password-12345",
        }),
      }),
    );
    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(response.status).toBeLessThan(500);
  });

  it("rejects untrusted origins", async () => {
    const response = await getAuth().handler(
      new Request("http://localhost:3000/api/auth/sign-in/email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: "https://untrusted.example.test",
          Cookie: "better-auth.session_token=untrusted-test",
          "Sec-Fetch-Site": "cross-site",
        },
        body: JSON.stringify({
          email: "auth@example.test",
          password: "test-only-password-12345",
        }),
      }),
    );
    expect(response.status).toBe(403);
  });
});
