"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useId, useRef, useState, type KeyboardEvent } from "react";
import { ArrowLeftRight, ChevronDown, Menu } from "lucide-react";
import type { MemberRole } from "@/modules/firms";
import {
  firmInitials,
  firmNavigation,
  memberRoleLabels,
  navigationIsActive,
} from "./navigation";

type FirmNavigationProps = {
  firmId: string;
  firmName: string;
  role: MemberRole;
};

export function FirmNavigation(props: FirmNavigationProps) {
  const path = usePathname();
  // Route changes, including browser Back, reset the compact menu without an effect.
  return <FirmMenu key={`${props.firmId}:${path}`} {...props} path={path} />;
}

function FirmMenu({
  firmId,
  firmName,
  role,
  path,
}: FirmNavigationProps & { path: string }) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const toggle = useRef<HTMLButtonElement>(null);
  const items = firmNavigation(firmId, role);
  const current = items.find((item) => navigationIsActive(path, item));
  function closeOnEscape(event: KeyboardEvent<HTMLElement>) {
    if (event.key === "Escape" && open) {
      event.preventDefault();
      setOpen(false);
      toggle.current?.focus();
    }
  }
  return (
    <aside className="live-firm-sidebar" aria-label="Current firm">
      <div className="live-firm-summary">
        <span className="firm-avatar" aria-hidden="true">
          {firmInitials(firmName)}
        </span>
        <div>
          <strong>{firmName}</strong>
          <p>{memberRoleLabels[role]}</p>
        </div>
      </div>
      <button
        ref={toggle}
        onKeyDown={closeOnEscape}
        type="button"
        className="firm-menu-toggle"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((value) => !value)}
      >
        <Menu size={18} aria-hidden="true" />
        <span>
          Firm menu{" "}
          <span className="firm-menu-current">
            · {current?.label ?? "Workspace"}
          </span>
        </span>
        <ChevronDown size={17} aria-hidden="true" />
      </button>
      <div className="live-firm-links" id={menuId} data-open={open}>
        <p className="firm-nav-label">WORKSPACE</p>
        <nav aria-label="Firm navigation">
          {items.map(({ href, activePrefix, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onKeyDown={closeOnEscape}
              onClick={() => setOpen(false)}
              aria-current={
                navigationIsActive(path, { href, activePrefix })
                  ? "page"
                  : undefined
              }
            >
              <Icon size={18} aria-hidden="true" />
              <span>{label}</span>
            </Link>
          ))}
        </nav>
        <Link
          href="/workspace"
          className="live-firm-switch"
          onKeyDown={closeOnEscape}
          onClick={() => setOpen(false)}
        >
          <ArrowLeftRight size={17} aria-hidden="true" />
          Switch firm
        </Link>
      </div>
    </aside>
  );
}
