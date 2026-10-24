import {
  Building2,
  CalendarDays,
  CheckCheck,
  ClipboardList,
  FileLock2,
  LayoutDashboard,
} from "lucide-react";
export const capabilities = [
  {
    id: "companies",
    icon: Building2,
    title: "Company records, together",
    description:
      "Keep company details, directors and officers organised in one place. Find the record you need without searching across scattered files.",
  },
  {
    id: "obligations",
    icon: CalendarDays,
    title: "A clearer view of deadlines",
    description:
      "Record obligations, confirm due dates and plan recurring work. See task and obligation dates together on your calendar.",
  },
  {
    id: "tasks",
    icon: ClipboardList,
    title: "Work with a clear owner",
    description:
      "Assign tasks, set priorities and break work into checklists. Keep instructions, comments and progress attached to the task.",
  },
  {
    id: "documents",
    icon: FileLock2,
    title: "Evidence beside the work",
    description:
      "Upload supporting files to a company or task. Access private documents through your signed-in firm workspace.",
  },
  {
    id: "reviews",
    icon: CheckCheck,
    title: "Review before completion",
    description:
      "Submit work to an independent reviewer, resolve corrections and record approval. Keep the submission history and evidence together.",
  },
  {
    id: "reporting",
    icon: LayoutDashboard,
    title: "Know what needs attention",
    description:
      "See overdue work, upcoming dates and pending reviews. Explore filtered reports and download CSVs with the right access.",
  },
];
export const workflow = [
  {
    title: "Set up your company",
    detail: "Save the company record and the people connected to it.",
  },
  {
    title: "Plan and assign the work",
    detail: "Confirm an obligation, set a due date and give the task an owner.",
  },
  {
    title: "Gather the evidence",
    detail:
      "Complete checklists, add comments and attach supporting documents.",
  },
  {
    title: "Review, approve, complete",
    detail: "Resolve feedback, record approval and retain the work history.",
  },
];
export const questions = [
  {
    question: "Who is MCA Software for?",
    answer:
      "Company secretaries and professional firms managing company records, recurring work, deadlines and internal reviews across their team.",
  },
  {
    question: "How do I get access?",
    answer:
      "Ask your firm administrator to arrange an account. Sign in with your account, choose your firm and open its workspace. Public self-registration is not currently available.",
  },
  {
    question: "Will the workspace show my firm's own records?",
    answer:
      "Yes. Your dashboard, calendar and reports use the records saved for your firm. A new workspace starts empty, ready for your companies and tasks.",
  },
  {
    question: "Does completing a task submit a government filing?",
    answer:
      "Completion records your team's internal work. Your team confirms due dates and remains responsible for professional review and any filing through the relevant official portal.",
  },
];
