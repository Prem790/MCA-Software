import { redirect } from "next/navigation";
import { readRuntimeConfig } from "@/platform/configuration/env";
export const dynamic = "force-dynamic";
export default function HomePage() {
  redirect(
    readRuntimeConfig().APP_MODE === "application" ? "/workspace" : "/preview",
  );
}
