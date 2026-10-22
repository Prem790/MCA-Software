"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  ArrowUpRight,
  Bell,
  Building2,
  CalendarDays,
  CheckSquare2,
  ChevronDown,
  CircleHelp,
  FileText,
  LayoutDashboard,
  ListChecks,
  Menu,
  Settings2,
  ShieldCheck,
  X,
} from "lucide-react";
import { tasks } from "./data";
import { cn } from "@/lib/utils";

const navigation = [
  { href: "/preview", label: "Overview", icon: LayoutDashboard },
  { href: "/preview/companies", label: "Companies", icon: Building2 },
  {
    href: "/preview/compliance",
    label: "Compliance tracker",
    icon: ListChecks,
  },
  { href: "/preview/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/preview/tasks", label: "Tasks & reviews", icon: CheckSquare2 },
  { href: "/preview/documents", label: "Documents", icon: FileText },
];

export function PreviewShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const sidebar = useRef<HTMLElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => {
    if (!menuOpen) return;
    const opener = menuButton.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    sidebar.current?.querySelector<HTMLButtonElement>("button")?.focus();
    const closeOnResize = () => {
      if (window.innerWidth > 800) setMenuOpen(false);
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        return;
      }
      if (event.key !== "Tab") return;
      const items =
        sidebar.current?.querySelectorAll<HTMLElement>("a[href], button");
      if (!items?.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      }
      if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", handleKey);
    window.addEventListener("resize", closeOnResize);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKey);
      window.removeEventListener("resize", closeOnResize);
      opener?.focus();
    };
  }, [menuOpen]);
  const section =
    navigation.find(
      (item) => item.href !== "/preview" && pathname.startsWith(item.href),
    )?.label ??
    (pathname.includes("settings")
      ? "Settings"
      : pathname.includes("guide")
        ? "Preview guide"
        : "Overview");
  return (
    <div className="workspace">
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <aside
        ref={sidebar}
        role={menuOpen ? "dialog" : undefined}
        aria-modal={menuOpen || undefined}
        className={cn("sidebar", menuOpen && "sidebar-open")}
        aria-label="Workspace sidebar"
      >
        <div className="brand-row">
          <Link
            href="/preview"
            className="brand"
            onClick={() => setMenuOpen(false)}
          >
            <span className="brand-symbol">
              <ShieldCheck size={21} />
            </span>
            <span>
              MCA<span className="brand-light">Software</span>
            </span>
          </Link>
          <button
            type="button"
            className="mobile-close icon-button"
            aria-label="Close navigation"
            onClick={() => setMenuOpen(false)}
          >
            <X size={20} />
          </button>
        </div>
        <div className="workspace-selector">
          <span className="workspace-initials">DF</span>
          <div>
            <strong>Demo Firm</strong>
            <span>Sample workspace</span>
          </div>
          <ChevronDown size={14} aria-hidden="true" />
        </div>
        <p className="nav-section-label">WORKSPACE</p>
        <nav aria-label="Main navigation">
          {navigation.map(({ href, label, icon: Icon }) => {
            const active =
              href === "/preview"
                ? pathname === href
                : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn("nav-link", active && "nav-link-active")}
                aria-current={active ? "page" : undefined}
                onClick={() => setMenuOpen(false)}
              >
                <Icon size={18} strokeWidth={1.7} aria-hidden="true" />
                {label}
                {label === "Tasks & reviews" && (
                  <span className="nav-count">
                    {
                      tasks.filter(
                        (task) => task.status === "submitted_for_review",
                      ).length
                    }
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
        <div className="sidebar-bottom">
          <Link
            href="/preview/settings"
            className={cn(
              "nav-link",
              pathname.includes("settings") && "nav-link-active",
            )}
            aria-current={pathname.includes("settings") ? "page" : undefined}
            onClick={() => setMenuOpen(false)}
          >
            <Settings2 size={18} aria-hidden="true" />
            Settings
          </Link>
          <Link
            href="/preview/guide"
            className={cn(
              "nav-link",
              pathname.includes("guide") && "nav-link-active",
            )}
            aria-current={pathname.includes("guide") ? "page" : undefined}
            onClick={() => setMenuOpen(false)}
          >
            <CircleHelp size={18} aria-hidden="true" />
            Preview guide
          </Link>
          <div className="sidebar-note">
            <span className="small-dot" />A little more clarity.
            <br />
            <span>For every company you manage.</span>
          </div>
          <div className="profile-row">
            <span className="avatar tone-teal">ST</span>
            <div>
              <strong>Sam Taylor</strong>
              <span>Demo administrator</span>
            </div>
          </div>
        </div>
      </aside>
      {menuOpen && (
        <button
          type="button"
          className="sidebar-scrim"
          aria-label="Close navigation overlay"
          onClick={() => setMenuOpen(false)}
        />
      )}
      <div className="workspace-main" inert={menuOpen}>
        <header className="topbar">
          <div className="breadcrumb">
            <button
              type="button"
              ref={menuButton}
              className="mobile-menu icon-button"
              aria-label="Open navigation"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(!menuOpen)}
            >
              <Menu size={20} />
            </button>
            <span>Workspace</span>
            <span className="breadcrumb-slash">/</span>
            <strong>{section}</strong>
          </div>
          <div className="topbar-right">
            <span className="today-label">Thu, 22 Oct 2026</span>
            <Link
              href="/preview/guide#notifications"
              className="icon-button notification-link"
              aria-label="Sample notifications"
            >
              <Bell size={19} />
              <span />
            </Link>
            <span className="topbar-divider" />
            <span className="avatar tone-teal">ST</span>
          </div>
        </header>
        <div className="preview-banner">
          <div>
            <span className="preview-pill">PREVIEW</span>
            <span>Explore with fictional data. Changes aren’t saved.</span>
          </div>
          <Link href="/preview/guide">
            What’s included <ArrowUpRight size={13} aria-hidden="true" />
          </Link>
        </div>
        <main id="main-content" className="page-content" tabIndex={-1}>
          {children}
        </main>
        <footer className="workspace-footer">
          <span>MCA Software · Sample workspace</span>
          <Link href="/login">
            View sign-in preview <ArrowUpRight size={12} aria-hidden="true" />
          </Link>
        </footer>
      </div>
    </div>
  );
}
