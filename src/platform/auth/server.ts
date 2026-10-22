import "server-only";
import { betterAuth } from "better-auth/minimal";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { readRuntimeConfig } from "@/platform/configuration/env";
import { getDatabase } from "@/platform/database/client";
import {
  user,
  session,
  account,
  verification,
} from "@/modules/identity/schema";

function createAuth() {
  const config = readRuntimeConfig();
  if (config.APP_MODE !== "application")
    throw new Error("Authentication is disabled in foundation mode");
  return betterAuth({
    appName: "MCA Software",
    baseURL: config.APP_URL,
    secret: config.BETTER_AUTH_SECRET,
    trustedOrigins: [config.APP_URL],
    logger: {
      level: "warn",
      // Provider messages can contain request URLs or adapter exceptions.
      // Retain severity without accepting their potentially sensitive payloads.
      log(level) {
        console.error(
          JSON.stringify({
            level,
            event: "authentication.provider",
            code: "AUTH_PROVIDER_EVENT",
            time: new Date().toISOString(),
          }),
        );
      },
    },
    database: drizzleAdapter(getDatabase(), {
      provider: "pg",
      schema: { user, session, account, verification },
    }),
    emailAndPassword: {
      enabled: true,
      disableSignUp: true,
      minPasswordLength: 12,
    },
    rateLimit: { enabled: true, window: 60, max: 30 },
    session: { expiresIn: 60 * 60 * 24, updateAge: 60 * 60 },
    advanced: {
      useSecureCookies: new URL(config.APP_URL).protocol === "https:",
      disableOriginCheck: false,
      disableCSRFCheck: false,
    },
  });
}

let instance: ReturnType<typeof createAuth> | undefined;
export function getAuth() {
  instance ??= createAuth();
  return instance;
}
