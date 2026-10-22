import "server-only";
import { z } from "zod";
import { getAuth } from "./server";
import { firms } from "@/platform/application/services";
import { readRuntimeConfig } from "@/platform/configuration/env";
import { ApplicationError } from "@/platform/http/errors";

export async function requireSession(headers: Headers) {
  if (readRuntimeConfig().APP_MODE !== "application")
    throw new ApplicationError(
      "SERVICE_UNAVAILABLE",
      "Application mode is not configured.",
    );
  const session = await getAuth().api.getSession({ headers });
  if (!session)
    throw new ApplicationError("UNAUTHENTICATED", "Sign in to continue.");
  return session;
}

export async function requireActor(headers: Headers, firmId: string) {
  const session = await requireSession(headers);
  if (!z.uuid().safeParse(firmId).success)
    throw new ApplicationError("NOT_FOUND", "Workspace was not found.");
  const actor = await firms().member(session.user.id, firmId);
  if (!actor)
    throw new ApplicationError("NOT_FOUND", "Workspace was not found.");
  return actor;
}
