import { afterEach, describe, expect, it, vi } from "vitest";
import { GET as health } from "@/app/api/health/route";
import { GET as readiness } from "@/app/api/readiness/route";
import { GET as auth } from "@/app/api/auth/[...all]/route";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("foundation HTTP contract", () => {
  it("reports process health without implying database readiness", async () => {
    const response = health();
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      status: "ok",
      service: "mca-software",
      requestId: expect.any(String),
    });
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });

  it("returns 503 for readiness without configured services", async () => {
    vi.stubEnv("APP_MODE", "foundation");
    const response = await readiness();
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({
      error: {
        code: "SERVICE_UNAVAILABLE",
        requestId: response.headers.get("X-Request-Id"),
      },
    });
  });

  it("does not expose an authentication endpoint in foundation mode", async () => {
    vi.stubEnv("APP_MODE", "foundation");
    const response = await auth(
      new Request("http://localhost:3000/api/auth/get-session"),
    );
    expect(response.status).toBe(503);
  });
});
