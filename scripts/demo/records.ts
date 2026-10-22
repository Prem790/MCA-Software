import { z } from "zod";

export function assertDemoSeedAllowed(
  environment: Readonly<Record<string, string | undefined>>,
) {
  if (
    environment.NODE_ENV === "production" ||
    environment.ALLOW_DEMO_SEED !== "true" ||
    !environment.SEED_DATABASE_URL
  ) {
    throw new Error(
      "Demo seed refused: use a disposable database, set SEED_DATABASE_URL and ALLOW_DEMO_SEED=true, and do not run in production",
    );
  }
  const parsed = z.url().safeParse(environment.SEED_DATABASE_URL);
  if (
    !parsed.success ||
    !["postgres:", "postgresql:"].includes(new URL(parsed.data).protocol)
  ) {
    throw new Error("Demo seed refused: invalid database URL");
  }
  return parsed.data;
}
