import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { LoginPreview } from "@/features/preview";
import { SignIn } from "@/features/identity/sign-in";
import { readRuntimeConfig } from "@/platform/configuration/env";
import { getAuth } from "@/platform/auth/server";
export const dynamic = "force-dynamic";
export default async function Page() {
  if (readRuntimeConfig().APP_MODE !== "application") return <LoginPreview />;
  if (await getAuth().api.getSession({ headers: await headers() }))
    redirect("/workspace");
  return <SignIn />;
}
