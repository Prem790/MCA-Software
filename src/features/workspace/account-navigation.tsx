"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, Home, UserRound } from "lucide-react";
import { SignOut } from "@/features/identity/sign-out";

export function AccountNavigation({ userName }: { userName?: string }) {
  const path = usePathname();
  return (
    <div className="workspace-account">
      <nav aria-label="Account navigation" className="workspace-account-nav">
        <Link
          href="/workspace"
          aria-current={path === "/workspace" ? "page" : undefined}
        >
          <Building2 size={17} aria-hidden="true" />
          My firms
        </Link>
        <Link href="/">
          <Home size={17} aria-hidden="true" />
          Home
        </Link>
      </nav>
      {userName !== undefined && (
        <>
          <div
            className="workspace-user"
            role="group"
            aria-label={`Signed in as ${userName}`}
          >
            <span className="workspace-user-icon" aria-hidden="true">
              <UserRound size={18} />
            </span>
            <div>
              <span>Signed in</span>
              <strong>{userName}</strong>
            </div>
          </div>
          <SignOut />
        </>
      )}
    </div>
  );
}
