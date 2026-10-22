import { describe, expect, it } from "vitest";
import {
  ConfigurationError,
  readRuntimeConfig,
} from "@/platform/configuration/env";

describe("runtime configuration", () => {
  it("runs the foundation without credentials", () => {
    expect(readRuntimeConfig({ NODE_ENV: "development" }).APP_MODE).toBe(
      "foundation",
    );
  });

  it("requires an explicit mode and HTTPS in production", () => {
    expect(() => readRuntimeConfig({ NODE_ENV: "production" })).toThrow(
      ConfigurationError,
    );
    expect(() =>
      readRuntimeConfig({ NODE_ENV: "production", APP_MODE: "foundation" }),
    ).toThrow(ConfigurationError);
    expect(
      readRuntimeConfig({
        NODE_ENV: "production",
        APP_MODE: "foundation",
        APP_URL: "https://demo.example.test",
      }).APP_MODE,
    ).toBe("foundation");
  });

  it("rejects an application with missing secrets", () => {
    expect(() => readRuntimeConfig({ APP_MODE: "application" })).toThrow(
      ConfigurationError,
    );
  });

  it("does not include credential values in errors", () => {
    const secret = "sensitive-value";
    try {
      readRuntimeConfig({
        APP_MODE: "application",
        DATABASE_URL: secret,
        BETTER_AUTH_SECRET: secret,
      });
      expect.fail("invalid configuration must fail");
    } catch (error) {
      expect(error).toBeInstanceOf(ConfigurationError);
      expect(String(error)).not.toContain(secret);
    }
  });

  it.each([
    "file:///tmp/test",
    "https://user:password@example.test",
    "https://example.test/path",
    "https://example.test?token=secret",
  ])("rejects unsafe app URL %s", (APP_URL) => {
    expect(() => readRuntimeConfig({ APP_URL })).toThrow(ConfigurationError);
  });

  it("accepts valid application settings", () => {
    expect(
      readRuntimeConfig({
        APP_MODE: "application",
        DATABASE_URL: "postgresql://user:password@localhost/mca",
        BETTER_AUTH_SECRET: "x".repeat(48),
      }).APP_MODE,
    ).toBe("application");
  });
});
