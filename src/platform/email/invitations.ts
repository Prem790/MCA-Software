import "server-only";
import type { InvitationDelivery } from "@/modules/firms/team-contracts";
import { readRuntimeConfig } from "@/platform/configuration/env";
import { requireEmailConfig } from "./configuration";
import { sendEmail } from "./resend";

export const invitationDelivery: InvitationDelivery = {
  assertConfigured() {
    requireEmailConfig();
  },
  async send(input) {
    const link = new URL("/accept-invitation", readRuntimeConfig().APP_URL);
    // Fragments are not sent in HTTP requests, referrers or Vercel access logs.
    link.hash = new URLSearchParams({ token: input.token }).toString();
    await sendEmail({
      to: input.email,
      subject: "Invitation to MCA Software",
      idempotencyKey: `invitation/${input.id}`,
      text: `You have been invited to ${input.firmName} as ${input.role}.\n\nOpen this link to join:\n${link.href}\n\nThis invitation expires in 72 hours. If you already have an account, sign in with the invited email address. Otherwise, you will set your own password. Ignore this email if you did not expect it.`,
    });
  },
};
