import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { AccountNavigation } from "@/features/workspace/account-navigation";
import { readRuntimeConfig } from "@/platform/configuration/env";
import { pageSession } from "@/platform/auth/page-session";
export const dynamic = "force-dynamic";
export default async function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session =
    readRuntimeConfig().APP_MODE === "application" ? await pageSession() : null;
  return (
    <div className="live-workspace">
      <a href="#workspace-content" className="skip-link">
        Skip to content
      </a>
      <header className="workspace-header">
        <Link href="/workspace" className="brand">
          <span className="brand-symbol">
            <ShieldCheck size={22} aria-hidden="true" />
          </span>
          MCA Software
        </Link>
        <AccountNavigation userName={session?.user.name} />
      </header>
      <main id="workspace-content" className="live-content" tabIndex={-1}>
        {children}
      </main>
      <footer className="live-footer">
        MCA Software · Independent practice management
      </footer>
    </div>
  );
}
