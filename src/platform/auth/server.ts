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
  rateLimit,
} from "@/modules/identity/schema";
import { sendEmail } from "@/platform/email/resend";
import { logServiceFailure } from "@/platform/observability/logger";
import { createHash, randomUUID } from "node:crypto";

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
      schema: { user, session, account, verification, rateLimit },
      transaction: true,
    }),
    emailAndPassword: {
      enabled: true,
      disableSignUp: true,
      minPasswordLength: 12,
      maxPasswordLength: 128,
      resetPasswordTokenExpiresIn: 60 * 60,
      revokeSessionsOnPasswordReset: true,
      async sendResetPassword({ user, token }) {
        const link = new URL("/reset-password", config.APP_URL);
        link.hash = new URLSearchParams({ token }).toString();
        try {
          await sendEmail({
            to: user.email,
            subject: "Reset your MCA Software password",
            text: `Open this link to choose a new password:\n${link.href}\n\nThis link expires in one hour and can be used once. If you did not request this, ignore this email.`,
            idempotencyKey: `password-reset/${createHash("sha256").update(token).digest("hex")}`,
          });
        } catch {
          // Keep the public response identical for existing and unknown addresses.
          logServiceFailure("email.password_reset_failed", randomUUID());
        }
      },
    },
    rateLimit: {
      enabled: true,
      storage: "database",
      window: 60,
      max: 30,
      customRules: {
        "/request-password-reset": { window: 60, max: 3 },
        "/reset-password": { window: 60, max: 5 },
      },
    },
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
