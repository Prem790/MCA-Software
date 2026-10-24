import "server-only";
import { z } from "zod";
import { ConfigurationError } from "@/platform/configuration/env";
import { ApplicationError } from "@/platform/http/errors";

const schema = z.object({
  RESEND_API_KEY: z.string().min(1),
  EMAIL_FROM: z.email().max(254),
});
export function readEmailConfig(
  environment: Readonly<Record<string, string | undefined>> = process.env,
) {
  const mode = environment.EMAIL_DELIVERY || "disabled";
  if (mode === "disabled") return null;
  if (mode !== "resend") throw new ConfigurationError(["EMAIL_DELIVERY"]);
  const parsed = schema.safeParse(environment);
  if (!parsed.success)
    throw new ConfigurationError(
      parsed.error.issues.map((issue) => issue.path.join(".")),
    );
  return parsed.data;
}
export function requireEmailConfig() {
  const config = readEmailConfig();
  if (!config)
    throw new ApplicationError(
      "SERVICE_UNAVAILABLE",
      "Email is not configured yet. Contact your administrator.",
    );
  return config;
}
