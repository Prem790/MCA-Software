import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import { createTestDatabase } from "./support/database";
import { user } from "@/modules/identity/schema";
import { firm, membership } from "@/modules/firms/schema";
import { company } from "@/modules/companies/schema";
import { task, taskReview } from "@/modules/tasks/schema";
import { obligation } from "@/modules/compliance/schema";
import { auditEvent } from "@/modules/audit/schema";
import { reportingRepository, reportingService } from "@/modules/reporting";
import { taskRepository, taskQuery } from "@/modules/tasks/server";
import type { Actor } from "@/modules/firms";
let database: Awaited<ReturnType<typeof createTestDatabase>>;
let admin: Actor, manager: Actor, staff: Actor, revoked: Actor, outsider: Actor;
let companyId: string, archivedId: string, otherId: string;
let records: (typeof task.$inferSelect)[];
const fixed = () => new Date("2026-10-24T12:00:00Z");
const reporting = () =>
  reportingService(reportingRepository(database.db), fixed);
beforeAll(async () => {
  database = await createTestDatabase();
  const [first, second] = await database.db
    .insert(firm)
    .values([{ name: "Report firm" }, { name: "Other firm" }])
    .returning();
  for (const [name, role, firmId] of [
    ["admin", "admin", first!.id],
    ["manager", "manager", first!.id],
    ["staff", "staff", first!.id],
    ["revoked", "staff", first!.id],
    ["outsider", "admin", second!.id],
  ] as const) {
    const id = randomUUID();
    await database.db
      .insert(user)
      .values({ id, name, email: `${name}@report.example.test` });
    await database.db.insert(membership).values({
      firmId,
      userId: id,
      role,
      revokedAt: name === "revoked" ? new Date() : null,
    });
    const actor: Actor = { firmId, userId: id, role };
    if (name === "admin") admin = actor;
    else if (name === "manager") manager = actor;
    else if (name === "staff") staff = actor;
    else if (name === "revoked") revoked = actor;
    else outsider = actor;
  }
  const companies = await database.db
    .insert(company)
    .values([
      { firmId: admin.firmId, name: "Main company" },
      {
        firmId: admin.firmId,
        name: "Archived company",
        archivedAt: new Date(),
      },
      { firmId: outsider.firmId, name: "Hidden company" },
    ])
    .returning();
  companyId = companies[0]!.id;
  archivedId = companies[1]!.id;
  otherId = companies[2]!.id;
  const specs: Omit<typeof task.$inferInsert, "firmId" | "companyId">[] = [
    {
      title: "=SUM(1,2)",
      dueDate: "2026-10-23",
      status: "in_progress",
      assigneeId: staff.userId,
    },
    {
      title: "Today %_ literal",
      dueDate: "2026-10-24",
      assigneeId: staff.userId,
    },
    {
      title: "Pending review",
      dueDate: "2026-10-25",
      status: "submitted_for_review",
      assigneeId: staff.userId,
      version: 2,
    },
    {
      title: "Completed",
      dueDate: "2026-10-22",
      status: "completed",
      assigneeId: staff.userId,
      completedAt: fixed(),
      completionEvidence: "Test fixture evidence",
    },
    {
      title: "Unassigned",
      dueDate: "2026-10-31",
      status: "waiting_for_documents",
    },
    {
      title: "Past approved",
      dueDate: "2026-10-23",
      status: "approved",
      assigneeId: manager.userId,
    },
    {
      title: "Historical assignee",
      dueDate: "2026-10-26",
      status: "in_progress",
      assigneeId: revoked.userId,
    },
  ];
  const rows = specs.map((row) => ({
    ...row,
    firmId: admin.firmId,
    companyId,
  }));
  records = await database.db.insert(task).values(rows).returning();
  await database.db.insert(task).values([
    {
      firmId: admin.firmId,
      companyId: archivedId,
      title: "Archived task",
      dueDate: "2026-10-20",
    },
    {
      firmId: outsider.firmId,
      companyId: otherId,
      title: "Hidden task",
      dueDate: "2026-10-20",
    },
  ]);
  await database.db.insert(taskReview).values({
    firmId: admin.firmId,
    companyId,
    taskId: records[2]!.id,
    submittedBy: staff.userId,
    reviewerId: manager.userId,
    submittedVersion: 1,
    evidence: "Review source records",
    snapshot: {
      title: "Pending review",
      description: "",
      priority: "normal",
      obligationId: null,
      dueDate: "2026-10-25",
      assigneeId: staff.userId,
      checklist: [],
      documents: [],
    },
  });
  await database.db.insert(obligation).values([
    {
      firmId: admin.firmId,
      companyId,
      title: "Today obligation",
      reportingPeriod: "October",
      dueDate: "2026-10-24",
      dueDateConfirmedAt: fixed(),
    },
    {
      firmId: admin.firmId,
      companyId,
      title: "Seventh day",
      reportingPeriod: "October",
      dueDate: "2026-10-31",
      dueDateConfirmedAt: fixed(),
    },
    {
      firmId: admin.firmId,
      companyId,
      title: "Unconfirmed",
      reportingPeriod: "October",
      dueDate: "2026-10-23",
    },
    {
      firmId: admin.firmId,
      companyId: archivedId,
      title: "Archived obligation",
      reportingPeriod: "October",
      dueDate: "2026-10-24",
      dueDateConfirmedAt: fixed(),
    },
    {
      firmId: outsider.firmId,
      companyId: otherId,
      title: "Hidden obligation",
      reportingPeriod: "October",
      dueDate: "2026-10-24",
      dueDateConfirmedAt: fixed(),
    },
  ]);
});
afterAll(async () => {
  await database?.client.close();
});
beforeEach(async () => {
  await database.db
    .update(auditEvent)
    .set({ occurredAt: new Date(Date.now() - 120000) })
    .where(eq(auditEvent.resourceType, "report"));
});
it("aggregates live scoped counts and preserves unassigned/revoked workload", async () => {
  const data = await reporting().dashboard(manager, { companyId });
  expect(data.today).toBe("2026-10-24");
  expect((await reporting().dashboard(admin)).counts.total).toBe(7);
  expect(data.counts).toMatchObject({
    total: 7,
    open: 6,
    completed: 1,
    overdue: 2,
    upcoming: 4,
    pendingReview: 1,
    approved: 1,
    waitingDocuments: 1,
    mine: 1,
    myReviews: 1,
  });
  expect(data.obligations).toEqual({ total: 3, upcoming: 2, unconfirmed: 1 });
  expect(data.reviewQueue.map((row) => row.id)).toEqual([records[2]!.id]);
  expect(data.workload.find((row) => row.assigneeId === null)?.open).toBe(1);
  expect(
    data.workload.find((row) => row.assigneeId === revoked.userId)?.revokedAt,
  ).toBeInstanceOf(Date);
  expect(data.workloadTotal).toBe(4);
  expect(
    (await reporting().dashboard(admin, { companyId })).counts.myReviews,
  ).toBe(0);
});
it("shows calendar records by date, with confirmed obligations separate from tasks", async () => {
  const day = await reporting().calendar(staff, {
    companyId,
    month: "2026-10",
    day: "2026-10-24",
  });
  expect(day.taskTotal).toBe(1);
  expect(day.tasks[0]!.id).toBe(records[1]!.id);
  expect(day.obligationTotal).toBe(1);
  expect(day.tasksByDay.reduce((total, item) => total + item.total, 0)).toBe(7);
  expect(
    day.obligationsByDay.reduce((total, item) => total + item.total, 0),
  ).toBe(2);
  const archived = await reporting().calendar(admin, {
    month: "2026-10",
    day: "2026-10-24",
    archived: "all",
  });
  expect(archived.obligationTotal).toBe(2);
  const prior = await reporting().calendar(staff, {
    companyId,
    month: "2026-09",
  });
  expect(prior.day).toBe("2026-09-01");
  expect(prior.tasks).toEqual([]);
  const boundary = reportingService(
    reportingRepository(database.db),
    () => new Date("2026-10-31T18:30:00Z"),
  );
  expect((await boundary.calendar(staff, { companyId })).day).toBe(
    "2026-11-01",
  );
});
it("keeps report filters aligned with task lists, including literal search and inclusive dates", async () => {
  const input = { companyId, q: "%_", priority: "normal", assigneeId: "me" };
  const report = await reporting().report(staff, "tasks", input);
  const list = await taskRepository(database.db).list(
    staff,
    taskQuery.parse(input),
    "2026-10-24",
  );
  expect(report.items.map((row) => row.id)).toEqual(
    list.items.map((row) => row.id),
  );
  expect(report.total).toBe(1);
  const range = await reporting().report(admin, "tasks", {
    companyId,
    dateFrom: "2026-10-23",
    dateTo: "2026-10-23",
  });
  expect(range.total).toBe(2);
  expect(
    (
      await reporting().report(manager, "tasks", { companyId, reviewer: "me" })
    ).items.map((row) => row.id),
  ).toEqual([records[2]!.id]);
  expect(
    (
      await reporting().report(admin, "tasks", { companyId, due: "overdue" })
    ).items.some((row) => row.status === "completed"),
  ).toBe(false);
  expect(
    (await reporting().report(admin, "tasks", { companyId: archivedId })).total,
  ).toBe(0);
  expect(
    (
      await reporting().report(admin, "tasks", {
        companyId: archivedId,
        archived: "all",
      })
    ).total,
  ).toBe(1);
  expect(() =>
    reporting().report(admin, "obligations", { reviewer: "me" }),
  ).toThrow("Task-only filters");
});
it("prevents cross-firm reporting and rechecks stale membership and export roles", async () => {
  expect(
    (await reporting().report(outsider, "tasks", { companyId })).total,
  ).toBe(0);
  expect((await reporting().calendar(outsider, { companyId })).tasks).toEqual(
    [],
  );
  expect(
    (await reporting().dashboard(outsider, { companyId })).counts.total,
  ).toBe(0);
  const forged = { ...admin, userId: outsider.userId };
  await expect(reporting().report(forged, "tasks", {})).rejects.toMatchObject({
    code: "NOT_FOUND",
  });
  await expect(reporting().dashboard(revoked)).rejects.toMatchObject({
    code: "NOT_FOUND",
  });
  await expect(reporting().calendar(revoked)).rejects.toMatchObject({
    code: "NOT_FOUND",
  });
  await expect(
    reporting().export(staff, "tasks", { companyId }, randomUUID()),
  ).rejects.toMatchObject({ code: "FORBIDDEN" });
  await database.db
    .update(membership)
    .set({ role: "staff" })
    .where(eq(membership.userId, manager.userId));
  try {
    expect(
      (await reporting().dashboard(manager, { companyId })).counts.myReviews,
    ).toBe(0);
    await expect(
      reporting().export(manager, "tasks", { companyId }, randomUUID()),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  } finally {
    await database.db
      .update(membership)
      .set({ role: "manager" })
      .where(eq(membership.userId, manager.userId));
  }
});
it("exports only matching rows, escapes formula titles and audits successful downloads", async () => {
  const exportRequestId = randomUUID();
  const result = await reporting().export(
    admin,
    "tasks",
    { companyId, dateFrom: "2026-10-23", dateTo: "2026-10-23" },
    exportRequestId,
  );
  expect(result.count).toBe(2);
  expect(result.filename).toBe("mca-tasks-2026-10-24.csv");
  expect(result.content).toContain('"\'=SUM(1,2)"');
  expect(result.content).not.toContain("Hidden task");
  expect(result.content).not.toContain("Test fixture evidence");
  const [event] = await database.db
    .select()
    .from(auditEvent)
    .where(
      and(
        eq(auditEvent.firmId, admin.firmId),
        eq(auditEvent.resourceType, "report"),
        eq(auditEvent.requestId, exportRequestId),
      ),
    );
  expect(event?.action).toBe("report.tasks_exported");
  const empty = await reporting().export(
    admin,
    "obligations",
    { companyId, q: "missing value" },
    randomUUID(),
  );
  expect(empty.count).toBe(0);
  expect(empty.content.trim().split("\r\n")).toHaveLength(1);
});
it("paginates stable report rows and exports all matches independent of page", async () => {
  const [extra] = await database.db
    .insert(company)
    .values({ firmId: admin.firmId, name: "Paging" })
    .returning();
  await database.db.insert(task).values(
    Array.from({ length: 25 }, (_, index) => ({
      firmId: admin.firmId,
      companyId: extra!.id,
      title: `Paged ${index}`,
      dueDate: "2026-10-24",
    })),
  );
  const first = await reporting().report(admin, "tasks", {
    companyId: extra!.id,
  });
  const second = await reporting().report(admin, "tasks", {
    companyId: extra!.id,
    page: 2,
  });
  expect(first.total).toBe(25);
  expect(first.items).toHaveLength(20);
  expect(second.items).toHaveLength(5);
  expect(
    new Set([...first.items, ...second.items].map((row) => row.id)).size,
  ).toBe(25);
  expect(
    (
      await reporting().export(
        admin,
        "tasks",
        { companyId: extra!.id, page: 2 },
        randomUUID(),
      )
    ).count,
  ).toBe(25);
  const calendar = await reporting().calendar(admin, {
    companyId: extra!.id,
    day: "2026-10-24",
    taskPage: 2,
  });
  expect(calendar.taskTotal).toBe(25);
  expect(calendar.tasks).toHaveLength(5);
});
it("rejects oversized exports without a truncated download or success audit", async () => {
  const [extra] = await database.db
    .insert(company)
    .values({ firmId: admin.firmId, name: "Large report" })
    .returning();
  await database.db.insert(task).values(
    Array.from({ length: 1001 }, (_, index) => ({
      firmId: admin.firmId,
      companyId: extra!.id,
      title: `Large ${index}`,
      dueDate: "2026-10-24",
    })),
  );
  const requestId = randomUUID();
  await expect(
    reporting().export(admin, "tasks", { companyId: extra!.id }, requestId),
  ).rejects.toMatchObject({ code: "CONFLICT" });
  expect(
    await database.db
      .select()
      .from(auditEvent)
      .where(eq(auditEvent.requestId, requestId)),
  ).toHaveLength(0);
});
it("enforces the shared per-member export budget", async () => {
  for (let index = 0; index < 5; index++)
    await reporting().export(admin, "tasks", { companyId }, randomUUID());
  await expect(
    reporting().export(admin, "obligations", { companyId }, randomUUID()),
  ).rejects.toMatchObject({ code: "RATE_LIMITED" });
});

it("refreshes saved status changes and keeps completed work on the calendar", async () => {
  const id = records[1]!.id;
  await database.db
    .update(task)
    .set({
      status: "completed",
      completedAt: fixed(),
      completionEvidence: "Fixture complete",
    })
    .where(eq(task.id, id));
  try {
    const data = await reporting().dashboard(staff, { companyId });
    expect(data.counts.completed).toBe(2);
    expect(data.counts.upcoming).toBe(3);
    expect(
      (await reporting().calendar(staff, { companyId, day: "2026-10-24" }))
        .tasks[0]!.status,
    ).toBe("completed");
  } finally {
    await database.db
      .update(task)
      .set({
        status: "not_started",
        completedAt: null,
        completionEvidence: null,
      })
      .where(eq(task.id, id));
  }
});
