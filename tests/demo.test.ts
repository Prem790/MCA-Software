import { buildDemoRecords } from "../src/demo/records";
import { describe, expect, it } from "vitest";
import { assertDemoSeedAllowed } from "../scripts/demo/records";

describe("demo seed safety", () => {
  it("refuses missing opt-in, missing URL and production", () => {
    expect(() => assertDemoSeedAllowed({})).toThrow("refused");
    expect(() => assertDemoSeedAllowed({ ALLOW_DEMO_SEED: "true" })).toThrow(
      "refused",
    );
    expect(() =>
      assertDemoSeedAllowed({
        NODE_ENV: "production",
        ALLOW_DEMO_SEED: "true",
        SEED_DATABASE_URL: "postgresql://localhost/demo",
      }),
    ).toThrow("refused");
  });
  it("requires a Postgres URL", () => {
    expect(() =>
      assertDemoSeedAllowed({
        ALLOW_DEMO_SEED: "true",
        SEED_DATABASE_URL: "https://example.test",
      }),
    ).toThrow("invalid");
  });
  it("produces deterministic fictional records without credentials", () => {
    expect(buildDemoRecords()).toEqual(buildDemoRecords());
    expect(buildDemoRecords().companies).toHaveLength(5);
    expect(buildDemoRecords().tasks).toHaveLength(20);
    expect(
      buildDemoRecords().companies.every((company) =>
        company.contactEmail.endsWith("@example.test"),
      ),
    ).toBe(true);
  });
});
