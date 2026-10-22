import { buildDemoRecords } from "@/demo/records";
import type { TaskStatus } from "@/modules/tasks";

export const previewDate = "2026-10-22";
export const previewMonth = "2026-10";
export const team = [
  {
    id: "demo-staff",
    name: "Alex Morgan",
    initials: "AM",
    role: "Staff",
    email: "alex@example.test",
    tone: "teal",
  },
  {
    id: "demo-manager",
    name: "Jordan Lee",
    initials: "JL",
    role: "Manager",
    email: "jordan@example.test",
    tone: "blue",
  },
  {
    id: "demo-admin",
    name: "Sam Taylor",
    initials: "ST",
    role: "Administrator",
    email: "sam@example.test",
    tone: "violet",
  },
] as const;

const base = buildDemoRecords();
const industries = [
  "Manufacturing",
  "Professional services",
  "Technology",
  "Retail",
  "Consulting",
];
const cities = ["Jaipur", "Mumbai", "Bengaluru", "New Delhi", "Pune"];

export const companies = base.companies.map((company, index) => ({
  ...company,
  name: company.name.replace(" (Fictional)", ""),
  initials: company.name.slice(0, 2).toUpperCase(),
  industry: industries[index] ?? "Services",
  city: cities[index] ?? "Jaipur",
  type: index === 4 ? "LLP" : "Private company",
  owner: team[index % team.length]!,
  tone: ["teal", "blue", "violet", "amber", "rose"][index] ?? "teal",
}));

const titles = [
  "Review financial statements",
  "Prepare board meeting agenda",
  "Review annual return information",
  "Reconcile company records",
];
const dates = [
  "2026-10-20",
  "2026-10-26",
  "2026-10-28",
  "2026-10-21",
  "2026-11-04",
];
const statuses: TaskStatus[] = [
  "not_started",
  "in_progress",
  "submitted_for_review",
  "completed",
  "waiting_for_documents",
  "changes_requested",
  "approved",
];

export const tasks = base.tasks.map((task, index) => {
  const company = companies.find((item) => item.id === task.companyId)!;
  const status = statuses[index % statuses.length]!;
  return {
    ...task,
    title: titles[index % titles.length]!,
    status,
    dueDate: dates[Math.floor(index / 4)]!,
    company,
    assignee: team[index % team.length]!,
    priority: index % 5 === 0 ? ("High" as const) : ("Normal" as const),
    category: index % 2 === 0 ? "Annual review" : "Company records",
    completionEvidence:
      status === "completed" ? "Fictional demonstration evidence" : null,
    completedAt: status === "completed" ? "2026-10-21" : null,
  };
});

export type PreviewCompany = (typeof companies)[number];
export type PreviewTask = (typeof tasks)[number];

export const documents = [
  {
    id: "agenda",
    name: "Board meeting agenda.txt",
    category: "Meeting papers",
    company: companies[0]!,
    date: "2026-10-21",
    size: "1 KB",
    href: "/samples/board-agenda.txt",
    owner: team[0],
  },
  {
    id: "checklist",
    name: "Annual review checklist.txt",
    category: "Checklists",
    company: companies[1]!,
    date: "2026-10-20",
    size: "1 KB",
    href: "/samples/review-checklist.txt",
    owner: team[1],
  },
  {
    id: "notes",
    name: "Company information notes.txt",
    category: "Company records",
    company: companies[2]!,
    date: "2026-10-19",
    size: "1 KB",
    href: "/samples/company-notes.txt",
    owner: team[2],
  },
  {
    id: "meeting",
    name: "Meeting preparation notes.txt",
    category: "Meeting papers",
    company: companies[3]!,
    date: "2026-10-18",
    size: "1 KB",
    href: "/samples/board-agenda.txt",
    owner: team[0],
  },
  {
    id: "review",
    name: "Records review checklist.txt",
    category: "Checklists",
    company: companies[4]!,
    date: "2026-10-17",
    size: "1 KB",
    href: "/samples/review-checklist.txt",
    owner: team[1],
  },
];

export const activity = [
  {
    person: team[1],
    action: "requested changes to",
    subject: tasks[5]!,
    when: "10:40 AM",
  },
  {
    person: team[0],
    action: "submitted for review",
    subject: tasks[2]!,
    when: "10:15 AM",
  },
  {
    person: team[2],
    action: "updated the checklist for",
    subject: tasks[1]!,
    when: "09:30 AM",
  },
];
