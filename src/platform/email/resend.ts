import "server-only";
import { requireEmailConfig } from "./configuration";

// Bounded synchronous delivery works in Vercel functions. No background promise or token logging.
export async function sendEmail(input: {
  to: string;
  subject: string;
  text: string;
  idempotencyKey: string;
}) {
  const config = requireEmailConfig();
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.RESEND_API_KEY}`,
      "Content-Type": "application/json",
      "Idempotency-Key": input.idempotencyKey,
    },
    body: JSON.stringify({
      from: `MCA Software <${config.EMAIL_FROM}>`,
      to: [input.to],
      subject: input.subject,
      text: input.text,
    }),
    signal: AbortSignal.timeout(10000),
  });
  // Provider response bodies may include addresses or message contents; never expose them.
  if (!response.ok)
    throw new Error("Email provider did not accept the request");
}
