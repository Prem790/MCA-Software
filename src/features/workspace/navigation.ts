import {
  Building2,
  CalendarDays,
  ClipboardList,
  Files,
  LayoutDashboard,
  ListChecks,
  NotebookTabs,
  PieChart,
  Users,
} from "lucide-react";
import type { MemberRole } from "@/modules/firms";
export function firmNavigation(firmId: string, role: MemberRole) {
  const base = `/workspace/${firmId}`;
  return [
    { href: `${base}/dashboard`, label: "Dashboard", icon: LayoutDashboard },
    { href: `${base}/companies`, label: "Companies", icon: Building2 },
    { href: `${base}/obligations`, label: "Obligations", icon: ListChecks },
    { href: `${base}/tasks`, label: "Tasks & reviews", icon: ClipboardList },
    { href: `${base}/calendar`, label: "Calendar", icon: CalendarDays },
    { href: `${base}/documents`, label: "Documents", icon: Files },
    {
      href: `${base}/reports/tasks`,
      activePrefix: `${base}/reports`,
      label: "Reports",
      icon: PieChart,
    },
    ...(role !== "staff"
      ? [{ href: `${base}/templates`, label: "Templates", icon: NotebookTabs }]
      : []),
    ...(role === "admin"
      ? [{ href: `${base}/team`, label: "Team and access", icon: Users }]
      : []),
  ];
}
export function navigationIsActive(
  path: string,
  item: { href: string; activePrefix?: string },
) {
  const prefix = item.activePrefix ?? item.href;
  return path === prefix || path.startsWith(prefix + "/");
}

// Display labels and initials only; membership authorization stays on the server.
export const memberRoleLabels: Record<MemberRole, string> = {
  admin: "Administrator",
  manager: "Manager",
  staff: "Staff",
};
export function firmInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => Array.from(word)[0] ?? "")
    .join("")
    .toUpperCase();
}
