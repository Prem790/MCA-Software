import { z } from "zod";

const commonSchema = z.object({
  APP_MODE: z.enum(["foundation", "application"]).default("foundation"),
  APP_URL: z.url().default("http://localhost:3000"),
});

const applicationSchema = commonSchema.extend({
  APP_MODE: z.literal("application"),
  DATABASE_URL: z.string().refine((value) => {
    try {
      const url = new URL(value);
      return (
        ["postgres:", "postgresql:"].includes(url.protocol) &&
        !!url.hostname &&
        url.pathname.length > 1 &&
        !url.hash
      );
    } catch {
      return false;
    }
  }),
  BETTER_AUTH_SECRET: z.string().min(32),
});

export class ConfigurationError extends Error {
  constructor(readonly fields: readonly string[]) {
    super(`Invalid configuration: ${fields.join(", ")}`);
    this.name = "ConfigurationError";
  }
}

export function readRuntimeConfig(
  environment: Readonly<Record<string, string | undefined>> = process.env,
) {
  const common = commonSchema.safeParse(environment);
  if (!common.success)
    throw new ConfigurationError(
      common.error.issues.map((issue) => issue.path.join(".")),
    );
  if (environment.NODE_ENV === "production" && !environment.APP_MODE) {
    throw new ConfigurationError(["APP_MODE"]);
  }
  const origin = new URL(common.data.APP_URL);
  if (
    !["http:", "https:"].includes(origin.protocol) ||
    origin.username ||
    origin.password ||
    origin.search ||
    origin.hash ||
    origin.pathname !== "/"
  ) {
    throw new ConfigurationError(["APP_URL"]);
  }
  if (environment.NODE_ENV === "production" && origin.protocol !== "https:") {
    throw new ConfigurationError(["APP_URL"]);
  }
  if (common.data.APP_MODE === "foundation")
    return { ...common.data, APP_MODE: "foundation" as const };
  const application = applicationSchema.safeParse(environment);
  if (!application.success)
    throw new ConfigurationError(
      application.error.issues.map((issue) => issue.path.join(".")),
    );
  return application.data;
}
