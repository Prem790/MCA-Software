import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, expect, it, vi } from "vitest";
import { and, eq } from "drizzle-orm";
import { createTestDatabase } from "./support/database";
import { user } from "@/modules/identity/schema";
import { firm, membership } from "@/modules/firms/schema";
import { company } from "@/modules/companies/schema";
import { document } from "@/modules/documents/schema";
import { documentRepository, documentService } from "@/modules/documents";
import {
  taskRepository,
  taskService,
  reviewRepository,
} from "@/modules/tasks/server";
import type { Actor } from "@/modules/firms";
import type { PrivateStorage } from "@/modules/documents/contracts";
let database: Awaited<ReturnType<typeof createTestDatabase>>;
let admin: Actor, manager: Actor, staff: Actor, outsider: Actor;
let companyId: string, otherCompanyId: string;
const objects = new Map<string, Uint8Array>();
const storage: PrivateStorage = {
  put: vi.fn<PrivateStorage["put"]>(async (key, bytes) => {
    objects.set(key, bytes);
  }),
  get: vi.fn<PrivateStorage["get"]>(async (key) => {
    const bytes = objects.get(key);
    return bytes
      ? new ReadableStream({
          start(controller) {
            controller.enqueue(bytes);
            controller.close();
          },
        })
      : null;
  }),
  remove: vi.fn<PrivateStorage["remove"]>(async (key) => {
    objects.delete(key);
  }),
};
const docs = () => documentService(documentRepository(database.db), storage);
const tasks = () => taskService(taskRepository(database.db));
const reviews = () => reviewRepository(database.db);
const context = (actor: Actor) => ({ ...actor, requestId: randomUUID() });
const content = new TextEncoder().encode("%PDF-1.7\nTest evidence");
beforeAll(async () => {
  database = await createTestDatabase();
  const [first, second] = await database.db
    .insert(firm)
    .values([{ name: "Review firm" }, { name: "Other firm" }])
    .returning();
  for (const [name, role, firmId] of [
    ["admin", "admin", first!.id],
    ["manager", "manager", first!.id],
    ["staff", "staff", first!.id],
    ["outsider", "admin", second!.id],
  ] as const) {
    const id = randomUUID();
    await database.db
      .insert(user)
      .values({ id, name, email: `${name}@review.example.test` });
    await database.db.insert(membership).values({ firmId, userId: id, role });
    const actor: Actor = { userId: id, firmId, role };
    if (name === "admin") admin = actor;
    else if (name === "manager") manager = actor;
    else if (name === "staff") staff = actor;
    else outsider = actor;
  }
  const rows = await database.db
    .insert(company)
    .values([
      { firmId: admin.firmId, name: "Company" },
      { firmId: outsider.firmId, name: "Hidden" },
    ])
    .returning();
  companyId = rows[0]!.id;
  otherCompanyId = rows[1]!.id;
});
afterAll(async () => {
  await database?.client.close();
});
beforeEach(async () => {
  // Each scenario gets a fresh rate window without a real delay or provider request.
  await database.db
    .update(document)
    .set({ createdAt: new Date(Date.now() - 120000) });
  vi.mocked(storage.put).mockClear();
  vi.mocked(storage.remove).mockClear();
});
async function newTask() {
  return tasks().create(
    admin,
    {
      companyId,
      title: "Prepare records",
      description: "Verify proof",
      priority: "normal",
      dueDate: "2027-02-01",
      assigneeId: staff.userId,
    },
    randomUUID(),
  );
}
it("scopes private list/download and never returns storage keys", async () => {
  const record = await docs().upload(
    admin,
    { companyId, name: "../proof.pdf" },
    content,
    randomUUID(),
  );
  expect(record.originalName).toBe(".._proof.pdf");
  expect(record).not.toHaveProperty("objectKey");
  const list = await docs().list(staff, { companyId });
  expect(list.some((row) => row.id === record.id)).toBe(true);
  const result = await docs().download(staff, record.id, randomUUID());
  expect(await new Response(result.stream).text()).toContain("Test evidence");
  await database.db
    .update(membership)
    .set({ revokedAt: new Date() })
    .where(eq(membership.userId, staff.userId));
  try {
    await expect(
      docs().download(staff, record.id, randomUUID()),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  } finally {
    await database.db
      .update(membership)
      .set({ revokedAt: null })
      .where(eq(membership.userId, staff.userId));
  }
  await expect(
    docs().download(outsider, record.id, randomUUID()),
  ).rejects.toMatchObject({ code: "NOT_FOUND" });
  await expect(docs().list(outsider, { companyId })).rejects.toMatchObject({
    code: "NOT_FOUND",
  });
  await expect(
    docs().upload(
      admin,
      { companyId: otherCompanyId, name: "proof.pdf" },
      content,
      randomUUID(),
    ),
  ).rejects.toMatchObject({ code: "NOT_FOUND" });
});
it("enforces worker, company and version scope for attachments", async () => {
  const record = await newTask();
  await expect(
    docs().upload(
      staff,
      { companyId, name: "proof.pdf" },
      content,
      randomUUID(),
    ),
  ).rejects.toMatchObject({ code: "FORBIDDEN" });
  await expect(
    docs().upload(
      staff,
      {
        companyId: otherCompanyId,
        taskId: record.id,
        version: 1,
        name: "proof.pdf",
      },
      content,
      randomUUID(),
    ),
  ).rejects.toMatchObject({ code: "NOT_FOUND" });
  await docs().upload(
    staff,
    { companyId, taskId: record.id, version: 1, name: "proof.pdf" },
    content,
    randomUUID(),
  );
  await expect(
    docs().upload(
      staff,
      { companyId, taskId: record.id, version: 1, name: "stale.pdf" },
      content,
      randomUUID(),
    ),
  ).rejects.toMatchObject({ code: "CONFLICT" });
});
it("prevents direct completion, self/foreign reviewers and unauthorized decisions", async () => {
  const record = await newTask();
  await expect(
    tasks().transition(
      staff,
      record.id,
      { version: 1, status: "completed", evidence: "Done" },
      randomUUID(),
    ),
  ).rejects.toMatchObject({ code: "FORBIDDEN" });
  for (const reviewerId of [admin.userId, staff.userId, outsider.userId]) {
    await expect(
      reviews().submit(context(admin), record.id, {
        version: 1,
        reviewerId,
        evidence: "Ready for review",
      }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  }
  const review = await reviews().submit(context(staff), record.id, {
    version: 1,
    reviewerId: manager.userId,
    evidence: "Ready for review",
  });
  await expect(
    reviews().decide(context(admin), record.id, {
      version: 2,
      reviewId: review!.id,
      outcome: "approved",
      feedback: "Checked",
    }),
  ).rejects.toMatchObject({ code: "FORBIDDEN" });
  await expect(
    reviews().decide(context(outsider), record.id, {
      version: 2,
      reviewId: review!.id,
      outcome: "approved",
      feedback: "Checked",
    }),
  ).rejects.toMatchObject({ code: "NOT_FOUND" });
  await expect(
    tasks().comment(
      staff,
      record.id,
      { body: "Change frozen content" },
      randomUUID(),
    ),
  ).rejects.toMatchObject({ code: "CONFLICT" });
});
it("retains snapshots across corrections, approval, completion and reopening", async () => {
  const record = await newTask();
  const file = await docs().upload(
    staff,
    { companyId, taskId: record.id, version: 1, name: "proof.pdf" },
    content,
    randomUUID(),
  );
  const first = await reviews().submit(context(staff), record.id, {
    version: 2,
    reviewerId: manager.userId,
    evidence: "Original evidence",
  });
  expect(first!.snapshot.documents[0]).toMatchObject({
    id: file.id,
    name: "proof.pdf",
  });
  await reviews().decide(context(manager), record.id, {
    version: 3,
    reviewId: first!.id,
    outcome: "changes_requested",
    feedback: "Correct the description",
  });
  const corrected = await tasks().update(
    admin,
    record.id,
    {
      version: 4,
      title: record.title,
      description: "Corrected instructions",
      priority: record.priority,
      assigneeId: record.assigneeId,
      dueDate: record.dueDate,
    },
    randomUUID(),
  );
  const second = await reviews().submit(context(staff), record.id, {
    version: corrected.version,
    reviewerId: manager.userId,
    evidence: "Corrections complete",
  });
  await reviews().decide(context(manager), record.id, {
    version: corrected.version + 1,
    reviewId: second!.id,
    outcome: "approved",
    feedback: "All records checked",
  });
  await expect(
    docs().upload(
      staff,
      {
        companyId,
        taskId: record.id,
        version: corrected.version + 2,
        name: "late.pdf",
      },
      content,
      randomUUID(),
    ),
  ).rejects.toMatchObject({ code: "CONFLICT" });
  const done = await tasks().transition(
    staff,
    record.id,
    {
      version: corrected.version + 2,
      status: "completed",
      evidence: "Completed approved work",
    },
    randomUUID(),
  );
  await tasks().transition(
    admin,
    record.id,
    { version: done.version, status: "in_progress" },
    randomUUID(),
  );
  await expect(
    tasks().transition(
      staff,
      record.id,
      {
        version: done.version + 1,
        status: "completed",
        evidence: "Reuse old approval",
      },
      randomUUID(),
    ),
  ).rejects.toMatchObject({ code: "FORBIDDEN" });
  const history = await reviews().list(admin.firmId, record.id);
  expect(history).toHaveLength(2);
  expect(history[0]).toMatchObject({
    submitterName: "staff",
    reviewerName: "manager",
    deciderName: "manager",
  });
  expect(history[1]!.snapshot.description).toBe("Verify proof");
  expect(history[1]!.feedback).toBe("Correct the description");
});
it("withdraws pending review on reopening and rejects stale/revoked decisions", async () => {
  const record = await newTask();
  const review = await reviews().submit(context(staff), record.id, {
    version: 1,
    reviewerId: manager.userId,
    evidence: "Review this",
  });
  await database.db
    .update(membership)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(membership.firmId, manager.firmId),
        eq(membership.userId, manager.userId),
      ),
    );
  try {
    await expect(
      reviews().decide(context(manager), record.id, {
        version: 2,
        reviewId: review!.id,
        outcome: "approved",
        feedback: "Checked",
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  } finally {
    await database.db
      .update(membership)
      .set({ revokedAt: null })
      .where(eq(membership.userId, manager.userId));
  }
  await tasks().transition(
    admin,
    record.id,
    { version: 2, status: "in_progress" },
    randomUUID(),
  );
  expect((await reviews().list(admin.firmId, record.id))[0]!.outcome).toBe(
    "withdrawn",
  );
  await expect(
    reviews().decide(context(manager), record.id, {
      version: 3,
      reviewId: review!.id,
      outcome: "approved",
      feedback: "Too late",
    }),
  ).rejects.toMatchObject({ code: "CONFLICT" });
});
it("cleans failed uploads and prevents publication after a concurrent submission", async () => {
  vi.mocked(storage.put).mockRejectedValueOnce(
    new Error("provider unavailable"),
  );
  await expect(
    docs().upload(
      admin,
      { companyId, name: "failed.pdf" },
      content,
      randomUUID(),
    ),
  ).rejects.toThrow("provider unavailable");
  expect(storage.remove).toHaveBeenCalledTimes(1);
  expect(
    (await docs().list(admin, { companyId })).some(
      (row) => row.originalName === "failed.pdf",
    ),
  ).toBe(false);
  const record = await newTask();
  vi.mocked(storage.put).mockImplementationOnce(async (key, bytes) => {
    objects.set(key, bytes);
    await reviews().submit(context(staff), record.id, {
      version: 1,
      reviewerId: manager.userId,
      evidence: "Concurrent submission",
    });
  });
  await expect(
    docs().upload(
      staff,
      { companyId, taskId: record.id, version: 1, name: "racing.pdf" },
      content,
      randomUUID(),
    ),
  ).rejects.toMatchObject({ code: "CONFLICT" });
  expect(
    await docs().list(admin, { companyId, taskId: record.id }),
  ).toHaveLength(0);
  expect(
    (await reviews().list(admin.firmId, record.id))[0]!.snapshot.documents,
  ).toHaveLength(0);
});
it("enforces upload budgets and keeps archived evidence readable but not writable", async () => {
  for (let index = 0; index < 5; index++)
    await docs().upload(
      admin,
      { companyId, name: `limit-${index}.pdf` },
      content,
      randomUUID(),
    );
  await expect(
    docs().upload(
      admin,
      { companyId, name: "limit.pdf" },
      content,
      randomUUID(),
    ),
  ).rejects.toMatchObject({ code: "RATE_LIMITED" });
  await database.db
    .update(company)
    .set({ archivedAt: new Date() })
    .where(eq(company.id, companyId));
  try {
    expect((await docs().list(staff, { companyId })).length).toBeGreaterThan(0);
    await expect(
      docs().upload(
        admin,
        { companyId, name: "archived.pdf" },
        content,
        randomUUID(),
      ),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  } finally {
    await database.db
      .update(company)
      .set({ archivedAt: null })
      .where(eq(company.id, companyId));
  }
});
it("does not delete a ready object when a finalize response is ambiguous", async () => {
  const repository = documentRepository(database.db);
  const finalize = repository.finalize;
  repository.finalize = async (...args) => {
    await finalize(...args);
    throw new Error("connection interrupted after commit");
  };
  const service = documentService(repository, storage);
  await expect(
    service.upload(
      admin,
      { companyId, name: "committed.pdf" },
      content,
      randomUUID(),
    ),
  ).rejects.toThrow("connection interrupted");
  expect(storage.remove).not.toHaveBeenCalled();
  const file = (await service.list(admin, { companyId })).find(
    (row) => row.originalName === "committed.pdf",
  )!;
  expect(await service.download(admin, file.id, randomUUID())).toHaveProperty(
    "stream",
  );
});
