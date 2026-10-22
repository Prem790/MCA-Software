import { getAuth } from "@/platform/auth/server";
import { readRuntimeConfig } from "@/platform/configuration/env";
import { requestId, serviceUnavailable } from "@/platform/http/responses";
import { logServiceFailure } from "@/platform/observability/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function handle(request: Request) {
  const id = requestId();
  try {
    if (readRuntimeConfig().APP_MODE !== "application")
      return serviceUnavailable(id);
    const response = await getAuth().handler(request);
    if (response.status >= 500) {
      logServiceFailure("authentication.provider_failed", id);
      return serviceUnavailable(id);
    }
    response.headers.set("X-Request-Id", id);
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch {
    logServiceFailure("authentication.failed", id);
    return serviceUnavailable(id);
  }
}

export { handle as GET, handle as POST };
