import { afterAll, beforeAll, expect, it, vi } from "vitest";
import { getAuth } from "@/platform/auth/server";
import { provisionAccount } from "@/modules/identity/infrastructure/provision";
import { createTestDatabase } from "./support/database";
let database: Awaited<ReturnType<typeof createTestDatabase>>;
vi.mock("@/platform/database/client", () => ({
  getDatabase: () => database.db,
}));
const origin = "https://workspace.example.test";
beforeAll(async () => {
  database = await createTestDatabase();
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("APP_MODE", "application");
  vi.stubEnv("APP_URL", origin);
  vi.stubEnv("DATABASE_URL", "postgresql://unused/test");
  vi.stubEnv(
    "BETTER_AUTH_SECRET",
    "test-only-secret-never-for-deployment-1234567890",
  );
  await provisionAccount(database.db, {
    name: "Security Test",
    email: "security@example.test",
    password: "test-only-password-12345",
    firmName: "Security test firm",
  });
});
afterAll(async () => {
  await database?.client.close();
  vi.unstubAllEnvs();
});
it("uses secure HTTP-only cookies and invalidates the session at sign-out", async () => {
  const signIn = await getAuth().handler(
    new Request(`${origin}/api/auth/sign-in/email`, {
      method: "POST",
      headers: { Origin: origin, "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "security@example.test",
        password: "test-only-password-12345",
      }),
    }),
  );
  expect(signIn.status).toBe(200);
  expect(signIn.headers.get("set-cookie")).toContain("Secure");
  expect(signIn.headers.get("set-cookie")).toContain("HttpOnly");
  const cookie = signIn.headers
    .getSetCookie()
    .map((value) => value.split(";")[0])
    .join("; ");
  const session = () =>
    getAuth().handler(
      new Request(`${origin}/api/auth/get-session`, {
        headers: { Cookie: cookie },
      }),
    );
  expect(await (await session()).json()).toMatchObject({
    user: { email: "security@example.test" },
  });
  const signOut = await getAuth().handler(
    new Request(`${origin}/api/auth/sign-out`, {
      method: "POST",
      headers: {
        Cookie: cookie,
        Origin: origin,
        "Content-Type": "application/json",
      },
      body: "{}",
    }),
  );
  expect(signOut.status).toBe(200);
  expect(await (await session()).json()).toBeNull();
});
