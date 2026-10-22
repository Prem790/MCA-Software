import { sql } from "drizzle-orm";
import { readRuntimeConfig } from "@/platform/configuration/env";
import { getDatabase } from "@/platform/database/client";
import { requestId, serviceUnavailable } from "@/platform/http/responses";
import { logServiceFailure } from "@/platform/observability/logger";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const id = requestId();
  try {
    if (readRuntimeConfig().APP_MODE !== "application")
      return serviceUnavailable(id);
    // Checks connectivity AND that the initial schema was migrated; not full product readiness.
    await getDatabase().execute(sql`select id from firm limit 0`);
    return Response.json(
      { status: "ready", requestId: id },
      {
        headers: { "Cache-Control": "no-store", "X-Request-Id": id },
      },
    );
  } catch {
    logServiceFailure("readiness.failed", id);
    return serviceUnavailable(id);
  }
}
