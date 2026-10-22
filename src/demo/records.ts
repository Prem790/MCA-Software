// Fixed identifiers make reruns non-destructive and fixtures reproducible.
export const demoFirmId = "10000000-0000-4000-8000-000000000001";
export const demoUserId = "demo-staff";

export function buildDemoRecords() {
  const companies = ["Cedar", "Harbor", "Juniper", "Maple", "Willow"].map(
    (name, index) => ({
      id: `20000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
      firmId: demoFirmId,
      name: `${name} Demo Company (Fictional)`,
      companyType: "Demonstration only",
      contactEmail: `${name.toLowerCase()}@example.test`,
    }),
  );
  const statuses = [
    "not_started",
    "in_progress",
    "submitted_for_review",
    "completed",
  ] as const;
  const tasks = companies.flatMap((company, companyIndex) =>
    statuses.map((status, index) => ({
      id: `30000000-0000-4000-8000-${String(companyIndex * 4 + index + 1).padStart(12, "0")}`,
      firmId: demoFirmId,
      companyId: company.id,
      title: `Sample document review ${index + 1} — no statutory deadline`,
      assigneeId: demoUserId,
      dueDate: "2026-11-15",
      status,
      completionEvidence:
        status === "completed" ? "Fictional demonstration evidence" : null,
      completedAt:
        status === "completed" ? new Date("2026-10-20T10:00:00Z") : null,
    })),
  );
  return { companies, tasks };
}
