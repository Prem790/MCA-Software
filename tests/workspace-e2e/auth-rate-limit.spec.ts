import { test, expect } from "../support/workspace-test";

test("sign-in throttling remains active within an isolated browser scenario", async ({
  request,
  baseURL,
}) => {
  if (!baseURL) throw new Error("Expected the local workspace test server.");
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await request.post("/api/auth/sign-in/email", {
      headers: { Origin: baseURL },
      data: {
        email: "admin@example.test",
        password: "incorrect-test-password",
      },
    });
    expect(response.status()).toBe(401);
  }
  const throttled = await request.post("/api/auth/sign-in/email", {
    headers: { Origin: baseURL },
    data: {
      email: "admin@example.test",
      password: "test-only-password-12345",
    },
  });
  expect(throttled.status()).toBe(429);
  expect(Number(throttled.headers()["x-retry-after"])).toBeGreaterThan(0);
});
