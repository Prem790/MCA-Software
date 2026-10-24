"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { MemberRole } from "@/modules/firms";
import { firmNavigation, navigationIsActive } from "./navigation";
export function FirmNavigation({
  firmId,
  firmName,
  role,
}: {
  firmId: string;
  firmName: string;
  role: MemberRole;
}) {
  const path = usePathname();
  const initials = firmName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => Array.from(word)[0] ?? "")
    .join("")
    .toUpperCase();
  return (
    <aside className="live-firm-sidebar" aria-label="Current firm">
      <div className="live-firm-summary">
        <span aria-hidden="true">{initials}</span>
        <div>
          <strong>{firmName}</strong>
          <p>{role}</p>
        </div>
      </div>
      <nav aria-label="Firm navigation">
        {firmNavigation(firmId, role).map(
          ({ href, activePrefix, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              aria-current={
                navigationIsActive(path, { href, activePrefix })
                  ? "page"
                  : undefined
              }
            >
              <Icon size={18} aria-hidden="true" />
              {label}
            </Link>
          ),
        )}
      </nav>
      <Link href="/workspace" className="live-firm-switch">
        Switch firm →
      </Link>
    </aside>
  );
}
