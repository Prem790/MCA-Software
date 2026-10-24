import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { invitationToken } from "@/modules/firms/team-contracts";
import { rateLimit } from "@/modules/identity/schema";
import { getDatabase } from "@/platform/database/client";
import { readRuntimeConfig } from "@/platform/configuration/env";
import { teams } from "@/platform/application/services";
import { ApplicationError } from "./errors";
import { assertWriteOrigin, businessResponse, jsonBody } from "./business";

// Token-scoped shared throttling bounds repeated password hashing on a valid invitation.
// Invalid tokens are checked before hashing passwords by the application service.
async function consumeInvitationLimit(token: string) {
  const key = `invitation:${createHash("sha256").update(token).digest("hex")}`;
  const now = Date.now();
  const expired = sql`${rateLimit.lastRequest} <= ${now - 60000}`;
  const [row] = await getDatabase()
    .insert(rateLimit)
    .values({ id: randomUUID(), key, count: 1, lastRequest: now })
    .onConflictDoUpdate({
      target: rateLimit.key,
      set: {
        count: sql`case when ${expired} then 1 else least(${rateLimit.count} + 1, 1000) end`,
        lastRequest: sql`case when ${expired} then ${now} else ${rateLimit.lastRequest} end`,
      },
    })
    .returning({ count: rateLimit.count });
  if (!row || row.count > 10)
    throw new ApplicationError(
      "RATE_LIMITED",
      "Too many invitation attempts. Wait a minute and try again.",
    );
}
export function invitationEndpoint(
  request: Request,
  work: (body: unknown, id: string) => Promise<unknown>,
) {
  return businessResponse(async (id) => {
    if (readRuntimeConfig().APP_MODE !== "application")
      throw new ApplicationError(
        "SERVICE_UNAVAILABLE",
        "Application mode is not configured.",
      );
    assertWriteOrigin(request);
    const body = await jsonBody(request);
    const token = invitationToken.parse(
      body && typeof body === "object" && "token" in body
        ? body.token
        : undefined,
    );
    // Do not allocate persistent limiter rows for arbitrary attacker-chosen tokens.
    await teams().preview(token);
    await consumeInvitationLimit(token);
    return work(body, id);
  });
}
