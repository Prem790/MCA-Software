import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { GET as download } from "@/app/api/firms/[firmId]/documents/[documentId]/download/route";
import { POST as upload } from "@/app/api/firms/[firmId]/documents/route";
import { ApplicationError } from "@/platform/http/errors";
const mocks = vi.hoisted(() => ({
  actor: vi.fn(),
  upload: vi.fn(),
  download: vi.fn(),
}));
vi.mock("@/platform/auth/session", () => ({ requireActor: mocks.actor }));
vi.mock("@/platform/application/services", () => ({
  documents: () => ({ upload: mocks.upload, download: mocks.download }),
}));
const firmId = "10000000-0000-4000-8000-000000000001";
const documentId = "10000000-0000-4000-8000-000000000002";
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("APP_MODE", "foundation");
  vi.stubEnv("APP_URL", "http://localhost:3000");
  mocks.actor.mockResolvedValue({ firmId, userId: "user", role: "admin" });
});
afterEach(() => vi.unstubAllEnvs());
it("blocks unauthenticated download before storage access", async () => {
  mocks.actor.mockRejectedValueOnce(
    new ApplicationError("UNAUTHENTICATED", "Sign in."),
  );
  const result = await download(new Request("http://localhost/download"), {
    params: Promise.resolve({ firmId, documentId }),
  });
  expect(result.status).toBe(401);
  expect(mocks.download).not.toHaveBeenCalled();
});
it("streams an authenticated attachment without public redirects or browser caching", async () => {
  mocks.download.mockResolvedValueOnce({
    stream: new ReadableStream({
      start(controller) {
        controller.enqueue(new Uint8Array([1, 2]));
        controller.close();
      },
    }),
    sizeBytes: 2,
    name: "proof.pdf",
  });
  const result = await download(new Request("http://localhost/download"), {
    params: Promise.resolve({ firmId, documentId }),
  });
  expect(result.status).toBe(200);
  expect(result.headers.get("cache-control")).toContain("no-store");
  expect(result.headers.get("content-disposition")).toContain("attachment");
  expect(result.headers.get("location")).toBeNull();
  expect(result.headers.get("content-type")).toBe("application/octet-stream");
  expect(result.headers.get("x-content-type-options")).toBe("nosniff");
  expect((await result.arrayBuffer()).byteLength).toBe(2);
});
it("rejects cross-origin writes before reading or uploading a file", async () => {
  const response = await upload(
    new Request("http://localhost/upload", {
      method: "POST",
      headers: {
        origin: "https://other.example.test",
        "content-type": "application/octet-stream",
      },
      body: "file",
    }),
    { params: Promise.resolve({ firmId }) },
  );
  expect(response.status).toBe(403);
  expect(mocks.upload).not.toHaveBeenCalled();
});
