import "server-only";
import { z, ZodError } from "zod";
import { ApplicationError } from "./errors";
import { requestId } from "./responses";
import { requireActor } from "@/platform/auth/session";
import { readRuntimeConfig } from "@/platform/configuration/env";
import { logServiceFailure } from "@/platform/observability/logger";
import type { Actor } from "@/modules/firms";

const statusCodes = {
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  VALIDATION_ERROR: 400,
  CONFLICT: 409,
  SERVICE_UNAVAILABLE: 503,
};
export async function businessResponse(
  work: (id: string) => Promise<unknown>,
  status = 200,
) {
  const id = requestId();
  const headers = { "Cache-Control": "no-store", "X-Request-Id": id };
  try {
    return Response.json({ data: await work(id) }, { status, headers });
  } catch (error) {
    let failure =
      error instanceof ApplicationError
        ? error
        : error instanceof ZodError
          ? new ApplicationError(
              "VALIDATION_ERROR",
              "Check the supplied fields and try again.",
            )
          : undefined;
    // Driver errors may be wrapped by Drizzle. Never serialize their messages.
    let cause: unknown = error;
    for (
      let depth = 0;
      depth < 4 && cause && typeof cause === "object";
      depth++
    ) {
      if ("code" in cause && cause.code === "23505")
        failure = new ApplicationError(
          "CONFLICT",
          "A record with that identifier already exists in this firm.",
        );
      cause = "cause" in cause ? cause.cause : undefined;
    }
    if (!failure) {
      logServiceFailure("business.request_failed", id);
      failure = new ApplicationError(
        "SERVICE_UNAVAILABLE",
        "The request could not be completed. Try again later.",
      );
    }
    return Response.json(
      {
        error: { code: failure.code, message: failure.message, requestId: id },
      },
      { status: statusCodes[failure.code], headers },
    );
  }
}
export function firmEndpoint(
  request: Request,
  firmId: string,
  work: (actor: Actor, id: string) => Promise<unknown>,
  status = 200,
) {
  return businessResponse(async (id) => {
    if (!["GET", "HEAD"].includes(request.method)) {
      if (
        request.headers.get("origin") !==
        new URL(readRuntimeConfig().APP_URL).origin
      )
        throw new ApplicationError(
          "FORBIDDEN",
          "This request origin is not allowed.",
        );
      if (request.headers.get("sec-fetch-site") === "cross-site")
        throw new ApplicationError(
          "FORBIDDEN",
          "Cross-site changes are not allowed.",
        );
    }
    const actor = await requireActor(request.headers, firmId);
    return work(actor, id);
  }, status);
}
export async function jsonBody(request: Request) {
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    throw new ApplicationError("VALIDATION_ERROR", "Send a JSON request.");
  const reader = request.body?.getReader();
  if (!reader)
    throw new ApplicationError(
      "VALIDATION_ERROR",
      "A request body is required.",
    );
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 16384) {
        await reader.cancel();
        throw new ApplicationError(
          "VALIDATION_ERROR",
          "The request body is too large.",
        );
      }
      chunks.push(value);
    }
    return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
  } catch (error) {
    if (error instanceof ApplicationError) throw error;
    throw new ApplicationError(
      "VALIDATION_ERROR",
      "The request body is not valid JSON.",
    );
  } finally {
    reader.releaseLock();
  }
}
export const resourceId = (value: string) => z.uuid().parse(value);
