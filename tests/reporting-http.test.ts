import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { POST } from "@/app/api/firms/[firmId]/reports/[kind]/export/route";
import { ApplicationError } from "@/platform/http/errors";
const mocks = vi.hoisted(() => ({ actor: vi.fn(), export: vi.fn() }));
vi.mock("@/platform/auth/session", () => ({ requireActor: mocks.actor }));
vi.mock("@/platform/application/services", () => ({
  reporting: () => ({ export: mocks.export }),
}));
const firmId = "10000000-0000-4000-8000-000000000001";
const context = { params: Promise.resolve({ firmId, kind: "tasks" }) };
const request = (origin = "http://localhost:3000") =>
  new Request("http://localhost:3000/export?q=test", {
    method: "POST",
    headers: { origin },
  });
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("APP_MODE", "foundation");
  vi.stubEnv("APP_URL", "http://localhost:3000");
  mocks.actor.mockResolvedValue({ firmId, userId: "admin", role: "admin" });
});
afterEach(() => vi.unstubAllEnvs());
it("requires a session and same-origin export request", async () => {
  expect((await POST(request("https://foreign.example"), context)).status).toBe(
    403,
  );
  expect(mocks.export).not.toHaveBeenCalled();
  mocks.actor.mockRejectedValueOnce(
    new ApplicationError("UNAUTHENTICATED", "Sign in."),
  );
  expect((await POST(request(), context)).status).toBe(401);
  expect(mocks.export).not.toHaveBeenCalled();
});
it("returns an authenticated no-store CSV attachment", async () => {
  mocks.export.mockResolvedValueOnce({
    content: '\uFEFF"Title"\r\n"test"\r\n',
    filename: "mca-tasks-2026-10-24.csv",
    count: 1,
  });
  const response = await POST(request(), context);
  expect(response.status).toBe(200);
  expect(response.headers.get("cache-control")).toContain("no-store");
  expect(response.headers.get("content-disposition")).toContain("attachment");
  expect(response.headers.get("content-type")).toContain("text/csv");
  expect(response.headers.get("x-report-count")).toBe("1");
  expect(response.headers.get("x-content-type-options")).toBe("nosniff");
  expect(mocks.export.mock.calls[0]![2]).toEqual({ q: "test" });
});
it("reports narrowing and throttling errors instead of a partial CSV", async () => {
  for (const [code, status] of [
    ["CONFLICT", 409],
    ["RATE_LIMITED", 429],
  ] as const) {
    mocks.export.mockRejectedValueOnce(
      new ApplicationError(code, "Narrow filters or wait."),
    );
    const response = await POST(request(), context);
    expect(response.status).toBe(status);
    expect(response.headers.get("content-type")).toContain("application/json");
  }
});
