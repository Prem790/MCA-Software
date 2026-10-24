import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { createTestDatabase } from "./support/database";
import { provisionAccount } from "@/modules/identity/infrastructure/provision";
import { getAuth } from "@/platform/auth/server";
import { complianceRepository, complianceService } from "@/modules/compliance";
import {
  taskRepository,
  taskService,
  reviewRepository,
} from "@/modules/tasks/server";
import type { Actor } from "@/modules/firms";
import { company } from "@/modules/companies/schema";
import { membership } from "@/modules/firms/schema";
import { obligation } from "@/modules/compliance/schema";
import { task as taskTable, taskComment } from "@/modules/tasks/schema";
import { auditEvent } from "@/modules/audit/schema";
import {
  POST as createTaskRoute,
  GET as listTasksRoute,
} from "@/app/api/firms/[firmId]/tasks/route";
import { PATCH as statusRoute } from "@/app/api/firms/[firmId]/tasks/[taskId]/status/route";
import { addCalendarDays, indiaToday } from "@/lib/work-dates";

let database: Awaited<ReturnType<typeof createTestDatabase>>;
let admin: Actor, staff: Actor, manager: Actor, outsider: Actor;
let companyId: string, otherCompanyId: string, adminCookie: string;
vi.mock("@/platform/database/client", () => ({
  getDatabase: () => database.db,
}));
const origin = "http://localhost:3000";
const password = "test-only-work-password-12345";
const obligations = () => complianceService(complianceRepository(database.db));
const tasks = () => taskService(taskRepository(database.db));
const requestId = () => randomUUID();
beforeAll(async () => {
  vi.stubEnv("APP_MODE", "application");
  vi.stubEnv("APP_URL", origin);
  vi.stubEnv("DATABASE_URL", "postgresql://unused/test");
  vi.stubEnv(
    "BETTER_AUTH_SECRET",
    "test-only-secret-never-for-deployment-1234567890",
  );
  database = await createTestDatabase();
  const first = await provisionAccount(database.db, {
    name: "Work admin",
    email: "work-admin@example.test",
    password,
    firmName: "Work firm",
  });
  admin = { ...first, role: "admin" };
  const second = await provisionAccount(database.db, {
    name: "Other admin",
    email: "work-other@example.test",
    password,
    firmName: "Other firm",
  });
  outsider = { ...second, role: "admin" };
  for (const role of ["staff", "manager"] as const) {
    const person = await provisionAccount(database.db, {
      name: `Work ${role}`,
      email: `work-${role}@example.test`,
      password,
      firmId: admin.firmId,
      role,
    });
    if (role === "staff") staff = { ...person, role };
    else manager = { ...person, role };
  }
  const [firstCompany] = await database.db
    .insert(company)
    .values({ firmId: admin.firmId, name: "Work company" })
    .returning();
  companyId = firstCompany!.id;
  const [secondCompany] = await database.db
    .insert(company)
    .values({ firmId: outsider.firmId, name: "Private other company" })
    .returning();
  otherCompanyId = secondCompany!.id;
  const signedIn = await getAuth().handler(
    new Request(`${origin}/api/auth/sign-in/email`, {
      method: "POST",
      headers: {
        Origin: origin,
        "Content-Type": "application/json",
        "X-Forwarded-For": "192.0.2.90",
      },
      body: JSON.stringify({ email: "work-admin@example.test", password }),
    }),
  );
  expect(signedIn.status).toBe(200);
  adminCookie = signedIn.headers
    .getSetCookie()
    .map((value) => value.split(";")[0])
    .join("; ");
});
afterAll(async () => {
  await database?.client.close();
  vi.unstubAllEnvs();
});
const obligationFields = () => ({
  companyId,
  title: "Monthly work",
  description: "Check source documents",
  dueDate: "2027-01-31",
  reportingPeriod: "January 2027",
  recurrence: "monthly" as const,
  confirmed: true as const,
});
async function newTask(fields: Record<string, unknown> = {}, actor = admin) {
  return tasks().create(
    actor,
    {
      companyId: actor.firmId === outsider.firmId ? otherCompanyId : companyId,
      title: "Work task",
      description: "Instructions",
      dueDate: "2027-01-31",
      priority: "normal",
      assigneeId: staff.userId,
      ...fields,
    },
    requestId(),
  );
}
function http(
  method: string,
  body?: unknown,
  overrides: Record<string, string> = {},
) {
  return new Request(`${origin}/api/firms/${admin.firmId}/tasks`, {
    method,
    headers: {
      Origin: origin,
      Cookie: adminCookie,
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      ...overrides,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

it("copies reusable templates without changing existing obligations when the template changes", async () => {
  const template = await obligations().saveTemplate(
    admin,
    { name: "Reusable work", description: "Original instructions" },
    requestId(),
  );
  const record = await obligations().create(
    admin,
    {
      ...obligationFields(),
      templateId: template.id,
      description: template.description,
    },
    requestId(),
  );
  await obligations().saveTemplate(
    admin,
    {
      name: "Updated reusable work",
      description: "New instructions",
      version: template.version,
    },
    requestId(),
    template.id,
  );
  expect((await obligations().detail(admin, record.id)).description).toBe(
    "Original instructions",
  );
  await expect(
    obligations().saveTemplate(
      admin,
      { name: "Stale update", description: "", version: template.version },
      requestId(),
      template.id,
    ),
  ).rejects.toMatchObject({ code: "CONFLICT" });
  await obligations().archiveTemplate(admin, template.id, requestId());
  await expect(
    obligations().create(
      admin,
      { ...obligationFields(), templateId: template.id },
      requestId(),
    ),
  ).rejects.toMatchObject({ code: "NOT_FOUND" });
});

it("creates recurring occurrences once, keeps the anchor and records each confirmation", async () => {
  const first = await obligations().create(
    admin,
    obligationFields(),
    requestId(),
  );
  const next = await obligations().next(
    admin,
    first.id,
    {
      dueDate: "2027-02-28",
      reportingPeriod: "February 2027",
      confirmed: true,
    },
    requestId(),
  );
  const repeated = await obligations().next(
    admin,
    first.id,
    {
      dueDate: "2027-02-28",
      reportingPeriod: "February 2027",
      confirmed: true,
    },
    requestId(),
  );
  expect(next.alreadyExists).toBe(false);
  expect(repeated.alreadyExists).toBe(true);
  expect(repeated.obligation.id).toBe(next.obligation.id);
  expect(next.obligation).toMatchObject({
    anchorDueDate: "2027-01-31",
    occurrenceNumber: 1,
    seriesId: first.seriesId,
  });
  expect(next.obligation.dueDateConfirmedAt).toBeInstanceOf(Date);
  const third = await obligations().next(
    admin,
    next.obligation.id,
    { dueDate: "2027-03-31", reportingPeriod: "March 2027", confirmed: true },
    requestId(),
  );
  expect(third.obligation.occurrenceNumber).toBe(2);
  const events = await database.db
    .select()
    .from(auditEvent)
    .where(eq(auditEvent.resourceId, next.obligation.id));
  expect(
    events.filter((event) => event.action === "obligation.next_created"),
  ).toHaveLength(1);
});

it("requires real confirmed dates and detects stale obligation edits", async () => {
  await expect(
    obligations().create(
      admin,
      { ...obligationFields(), confirmed: false },
      requestId(),
    ),
  ).rejects.toThrow();
  await expect(
    obligations().create(
      admin,
      { ...obligationFields(), dueDate: "2027-02-30" },
      requestId(),
    ),
  ).rejects.toThrow();
  const record = await obligations().create(
    admin,
    obligationFields(),
    requestId(),
  );
  const fields = {
    title: record.title,
    description: record.description,
    reportingPeriod: record.reportingPeriod,
    dueDate: "2027-02-01",
    confirmed: true,
    version: record.version,
  };
  const changed = await obligations().update(
    admin,
    record.id,
    fields,
    requestId(),
  );
  expect(changed.version).toBe(2);
  await expect(
    obligations().update(admin, record.id, fields, requestId()),
  ).rejects.toMatchObject({ code: "CONFLICT" });
  await expect(
    obligations().next(
      admin,
      record.id,
      {
        dueDate: "2027-01-01",
        reportingPeriod: "Invalid next",
        confirmed: true,
      },
      requestId(),
    ),
  ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
});

it("enforces tenant/company links and active assignees beyond foreign keys", async () => {
  const linked = await obligations().create(
    admin,
    obligationFields(),
    requestId(),
  );
  await expect(
    obligations().create(
      admin,
      { ...obligationFields(), companyId: otherCompanyId },
      requestId(),
    ),
  ).rejects.toMatchObject({ code: "NOT_FOUND" });
  await expect(obligations().detail(outsider, linked.id)).rejects.toMatchObject(
    { code: "NOT_FOUND" },
  );
  await expect(newTask({ assigneeId: outsider.userId })).rejects.toMatchObject({
    code: "VALIDATION_ERROR",
  });
  await expect(
    newTask({ companyId: otherCompanyId, obligationId: linked.id }),
  ).rejects.toMatchObject({ code: "NOT_FOUND" });
  const [otherLocalCompany] = await database.db
    .insert(company)
    .values({ firmId: admin.firmId, name: "Different company in same firm" })
    .returning();
  await expect(
    newTask({ companyId: otherLocalCompany!.id, obligationId: linked.id }),
  ).rejects.toMatchObject({ code: "NOT_FOUND" });
  const created = await newTask({ obligationId: linked.id });
  await expect(tasks().detail(outsider, created.id)).rejects.toMatchObject({
    code: "NOT_FOUND",
  });
  const other = await newTask(
    { assigneeId: null, title: "Other firm's hidden task" },
    outsider,
  );
  expect(
    (await tasks().list(admin, {})).items.some((row) => row.id === other.id),
  ).toBe(false);
});

it("allows assigned staff progress/comments but denies creation, reassignment and other staff work", async () => {
  const record = await newTask();
  await expect(newTask({}, staff)).rejects.toMatchObject({ code: "FORBIDDEN" });
  await expect(
    obligations().create(staff, obligationFields(), requestId()),
  ).rejects.toMatchObject({ code: "FORBIDDEN" });
  await expect(
    tasks().update(
      staff,
      record.id,
      {
        title: record.title,
        description: "",
        priority: "urgent",
        dueDate: record.dueDate,
        assigneeId: staff.userId,
        version: record.version,
      },
      requestId(),
    ),
  ).rejects.toMatchObject({ code: "FORBIDDEN" });
  const moved = await tasks().transition(
    staff,
    record.id,
    { version: record.version, status: "in_progress" },
    requestId(),
  );
  await tasks().comment(
    staff,
    record.id,
    { body: "Documents requested" },
    requestId(),
  );
  expect((await tasks().detail(admin, record.id)).comments[0]!.body).toBe(
    "Documents requested",
  );
  const unassigned = await newTask({ assigneeId: null });
  await expect(
    tasks().comment(
      staff,
      unassigned.id,
      { body: "Not assigned to me" },
      requestId(),
    ),
  ).rejects.toMatchObject({ code: "FORBIDDEN" });
  expect(moved.version).toBe(2);
});

it("requires checked checklist items and evidence, rejects stale edits, and protects completed work", async () => {
  const record = await newTask();
  await tasks().addChecklist(
    manager,
    record.id,
    { title: "Confirm source", version: record.version },
    requestId(),
  );
  let detail = await tasks().detail(admin, record.id);
  const reviewService = reviewRepository(database.db);
  await expect(
    reviewService.submit({ ...staff, requestId: requestId() }, record.id, {
      version: detail.task.version,
      reviewerId: manager.userId,
      evidence: "Source records checked",
    }),
  ).rejects.toMatchObject({ code: "CONFLICT" });
  await tasks().toggleChecklist(
    staff,
    record.id,
    detail.checklist[0]!.id,
    { checked: true, version: detail.task.version },
    requestId(),
  );
  detail = await tasks().detail(admin, record.id);
  const submission = await reviewService.submit(
    { ...staff, requestId: requestId() },
    record.id,
    {
      version: detail.task.version,
      reviewerId: manager.userId,
      evidence: "Source records checked",
    },
  );
  detail = await tasks().detail(admin, record.id);
  await reviewService.decide(
    { ...manager, requestId: requestId() },
    record.id,
    {
      version: detail.task.version,
      reviewId: submission!.id,
      outcome: "approved",
      feedback: "Source documents verified",
    },
  );
  detail = await tasks().detail(admin, record.id);
  await expect(
    tasks().transition(
      staff,
      record.id,
      { version: detail.task.version, status: "completed" },
      requestId(),
    ),
  ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  const completed = await tasks().transition(
    staff,
    record.id,
    {
      version: detail.task.version,
      status: "completed",
      evidence: "Checked supporting records",
    },
    requestId(),
  );
  expect(completed.completedAt).toBeInstanceOf(Date);
  await expect(
    tasks().comment(staff, record.id, { body: "Closed task" }, requestId()),
  ).rejects.toMatchObject({ code: "CONFLICT" });
  await expect(
    tasks().transition(
      staff,
      record.id,
      { version: completed.version, status: "in_progress" },
      requestId(),
    ),
  ).rejects.toMatchObject({ code: "FORBIDDEN" });
  const reopened = await tasks().transition(
    manager,
    record.id,
    { version: completed.version, status: "in_progress" },
    requestId(),
  );
  expect(reopened.completionEvidence).toBeNull();
  expect(
    (await tasks().detail(admin, record.id)).comments.some((comment) =>
      comment.body.includes("Checked supporting records"),
    ),
  ).toBe(true);
  await expect(
    tasks().transition(
      staff,
      record.id,
      {
        version: completed.version,
        status: "completed",
        evidence: "Stale completion",
      },
      requestId(),
    ),
  ).rejects.toMatchObject({ code: "CONFLICT" });
});

it("checks checklist item scope and keeps comments paginated", async () => {
  const a = await newTask();
  const b = await newTask();
  await tasks().addChecklist(
    admin,
    a.id,
    { title: "Only for A", version: 1 },
    requestId(),
  );
  const detail = await tasks().detail(admin, a.id);
  await expect(
    tasks().toggleChecklist(
      staff,
      b.id,
      detail.checklist[0]!.id,
      { checked: true, version: 1 },
      requestId(),
    ),
  ).rejects.toMatchObject({ code: "NOT_FOUND" });
  for (let index = 0; index < 10; index++)
    await tasks().comment(
      staff,
      a.id,
      { body: `Comment ${index}` },
      requestId(),
    );
  await expect(
    tasks().comment(staff, a.id, { body: "Too many" }, requestId()),
  ).rejects.toMatchObject({ code: "RATE_LIMITED" });
  expect((await tasks().detail(admin, a.id)).commentTotal).toBe(10);
  expect(
    (await tasks().detail(admin, a.id, { commentPage: 2 })).comments,
  ).toHaveLength(0);
  await database.db.insert(taskComment).values(
    Array.from({ length: 25 }, (_, index) => ({
      firmId: admin.firmId,
      companyId,
      taskId: a.id,
      authorId: staff.userId,
      body: `Earlier fixture ${index}`,
      createdAt: new Date(Date.now() - 100000 - index),
    })),
  );
  expect((await tasks().detail(admin, a.id)).comments).toHaveLength(20);
  expect(
    (await tasks().detail(admin, a.id, { commentPage: 2 })).comments,
  ).toHaveLength(15);
});

it("finds unfinished overdue work using India dates and excludes completed tasks", async () => {
  const title = `Deadline ${randomUUID()}`;
  const dueDate = addCalendarDays(indiaToday(), -1);
  const open = await newTask({ title, dueDate });
  const done = await newTask({ title, dueDate });
  const review = await reviewRepository(database.db).submit(
    { ...admin, requestId: requestId() },
    done.id,
    {
      version: 1,
      reviewerId: manager.userId,
      evidence: "Test source evidence",
    },
  );
  await reviewRepository(database.db).decide(
    { ...manager, requestId: requestId() },
    done.id,
    {
      version: 2,
      reviewId: review!.id,
      outcome: "approved",
      feedback: "Checked source evidence",
    },
  );
  await tasks().transition(
    admin,
    done.id,
    { version: 3, status: "completed", evidence: "Test completion evidence" },
    requestId(),
  );
  const result = await tasks().list(staff, {
    q: title,
    due: "overdue",
    assigneeId: "me",
  });
  expect(result.items.map((row) => row.id)).toEqual([open.id]);
});

it("denies stale revoked actors and assignment to revoked members", async () => {
  const target = await provisionAccount(database.db, {
    name: "Revoked member",
    email: "work-revoked@example.test",
    password,
    firmId: admin.firmId,
    role: "manager",
  });
  const oldActor: Actor = { ...target, role: "manager" };
  await database.db
    .update(membership)
    .set({ role: "staff" })
    .where(eq(membership.userId, target.userId));
  await expect(
    tasks().create(
      oldActor,
      {
        companyId,
        title: "Stale manager role",
        description: "",
        dueDate: "2027-01-31",
        priority: "normal",
        assigneeId: null,
      },
      requestId(),
    ),
  ).rejects.toMatchObject({ code: "FORBIDDEN" });
  await database.db
    .update(membership)
    .set({ revokedAt: new Date() })
    .where(eq(membership.userId, target.userId));
  await expect(newTask({ assigneeId: target.userId })).rejects.toMatchObject({
    code: "VALIDATION_ERROR",
  });
  await expect(
    tasks().create(
      oldActor,
      {
        companyId,
        title: "Revoked actor",
        description: "",
        dueDate: "2027-01-31",
        priority: "normal",
        assigneeId: null,
      },
      requestId(),
    ),
  ).rejects.toMatchObject({ code: "NOT_FOUND" });
});

it("keeps archived-company history readable but rejects task and obligation writes", async () => {
  const [archived] = await database.db
    .insert(company)
    .values({ firmId: admin.firmId, name: "Archive test" })
    .returning();
  const record = await obligations().create(
    admin,
    { ...obligationFields(), companyId: archived!.id },
    requestId(),
  );
  const job = await newTask({ companyId: archived!.id });
  await database.db
    .update(company)
    .set({ archivedAt: new Date() })
    .where(eq(company.id, archived!.id));
  expect(
    (await tasks().detail(admin, job.id)).task.companyArchivedAt,
  ).toBeInstanceOf(Date);
  await expect(
    tasks().comment(admin, job.id, { body: "Archived" }, requestId()),
  ).rejects.toMatchObject({ code: "NOT_FOUND" });
  await expect(
    obligations().next(
      admin,
      record.id,
      { reportingPeriod: "Next", dueDate: "2027-02-28", confirmed: true },
      requestId(),
    ),
  ).rejects.toMatchObject({ code: "NOT_FOUND" });
});

it("enforces HTTP sessions, tenant access, origins and reserved review states", async () => {
  const record = await newTask();
  const context = { params: Promise.resolve({ firmId: admin.firmId }) };
  expect(
    (await listTasksRoute(http("GET", undefined, { Cookie: "" }), context))
      .status,
  ).toBe(401);
  expect(
    (
      await listTasksRoute(http("GET"), {
        params: Promise.resolve({ firmId: outsider.firmId }),
      })
    ).status,
  ).toBe(404);
  const fields = {
    companyId,
    title: "HTTP task",
    description: "",
    dueDate: "2027-01-31",
    priority: "normal",
    assigneeId: null,
  };
  expect(
    (
      await createTaskRoute(
        http("POST", fields, { Origin: "https://attacker.example.test" }),
        context,
      )
    ).status,
  ).toBe(403);
  expect(
    (
      await createTaskRoute(
        http("POST", { ...fields, firmId: outsider.firmId }),
        context,
      )
    ).status,
  ).toBe(400);
  expect(
    (
      await statusRoute(
        http("PATCH", { version: record.version, status: "approved" }),
        {
          params: Promise.resolve({ firmId: admin.firmId, taskId: record.id }),
        },
      )
    ).status,
  ).toBe(400);
  await database.db
    .update(taskTable)
    .set({ status: "approved" })
    .where(eq(taskTable.id, record.id));
  await expect(
    tasks().comment(
      staff,
      record.id,
      { body: "Cannot change reserved review state" },
      requestId(),
    ),
  ).rejects.toMatchObject({ code: "CONFLICT" });
  await tasks().transition(
    admin,
    record.id,
    { version: record.version, status: "in_progress" },
    requestId(),
  );
});

it("does not reschedule linked tasks when a confirmed obligation deadline changes", async () => {
  const record = await obligations().create(
    admin,
    obligationFields(),
    requestId(),
  );
  const linked = await newTask({
    obligationId: record.id,
    dueDate: record.dueDate,
  });
  await obligations().update(
    admin,
    record.id,
    {
      title: record.title,
      description: record.description,
      reportingPeriod: record.reportingPeriod,
      dueDate: "2027-02-01",
      confirmed: true,
      version: record.version,
    },
    requestId(),
  );
  expect((await tasks().detail(admin, linked.id)).task.dueDate).toBe(
    "2027-01-31",
  );
  const [row] = await database.db
    .select()
    .from(obligation)
    .where(eq(obligation.id, record.id));
  expect(row!.dueDate).toBe("2027-02-01");
});
