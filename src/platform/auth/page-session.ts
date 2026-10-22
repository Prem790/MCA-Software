import "server-only";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { requireActor, requireSession } from "./session";
import { ApplicationError } from "@/platform/http/errors";

export async function pageSession() {
  try {
    return await requireSession(await headers());
  } catch (error) {
    if (error instanceof ApplicationError && error.code === "UNAUTHENTICATED")
      redirect("/login");
    if (
      error instanceof ApplicationError &&
      error.code === "SERVICE_UNAVAILABLE"
    )
      redirect("/workspace");
    throw error;
  }
}
export async function pageActor(firmId: string) {
  try {
    return await requireActor(await headers(), firmId);
  } catch (error) {
    if (error instanceof ApplicationError && error.code === "UNAUTHENTICATED")
      redirect("/login");
    if (
      error instanceof ApplicationError &&
      error.code === "SERVICE_UNAVAILABLE"
    )
      redirect("/workspace");
    if (error instanceof ApplicationError && error.code === "NOT_FOUND")
      notFound();
    throw error;
  }
}
