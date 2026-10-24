import { afterEach, expect, it, vi } from "vitest";
import { readEmailConfig } from "@/platform/email/configuration";
import { sendEmail } from "@/platform/email/resend";
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
it("leaves mail disabled by default and rejects incomplete enabled configuration", () => {
  expect(readEmailConfig({})).toBeNull();
  expect(() => readEmailConfig({ EMAIL_DELIVERY: "resend" })).toThrow(
    "RESEND_API_KEY",
  );
});
it("sends text email with idempotency and bounded timeout without a live provider request", async () => {
  vi.stubEnv("EMAIL_DELIVERY", "resend");
  vi.stubEnv("RESEND_API_KEY", "test-only-email-key");
  vi.stubEnv("EMAIL_FROM", "sender@example.test");
  const fetch = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
  vi.stubGlobal("fetch", fetch);
  await sendEmail({
    to: "recipient@example.test",
    subject: "Test",
    text: "Test message",
    idempotencyKey: "test/invitation",
  });
  expect(fetch).toHaveBeenCalledWith(
    "https://api.resend.com/emails",
    expect.objectContaining({
      method: "POST",
      signal: expect.any(AbortSignal),
      headers: expect.objectContaining({
        "Idempotency-Key": "test/invitation",
      }),
    }),
  );
});
