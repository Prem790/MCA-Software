import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq, sql } from "drizzle-orm";
import * as schema from "@/platform/database/schema";
import { buildDemoRecords, demoFirmId, demoUserId } from "../src/demo/records";
import { createTestDatabase } from "./support/database";

let database: Awaited<ReturnType<typeof createTestDatabase>>;
const otherFirm = "10000000-0000-4000-8000-000000000002";
const otherCompany = "20000000-0000-4000-8000-000000000099";

beforeAll(async () => {
  database = await createTestDatabase();
  const { db } = database;
  await db
    .insert(schema.user)
    .values({ id: demoUserId, name: "Test", email: "staff@example.test" });
  await db.insert(schema.firm).values([
    { id: demoFirmId, name: "Demo" },
    { id: otherFirm, name: "Other" },
  ]);
  await db
    .insert(schema.membership)
    .values({ firmId: demoFirmId, userId: demoUserId, role: "staff" });
  await db
    .insert(schema.company)
    .values([
      ...buildDemoRecords().companies,
      { id: otherCompany, firmId: otherFirm, name: "Other company" },
    ]);
});
afterAll(async () => {
  await database?.client.close();
});

describe("initial PostgreSQL migration", () => {
  it("migrates twice without replaying applied changes", async () => {
    const { migrate } = await import("drizzle-orm/pglite/migrator");
    await migrate(database.db, { migrationsFolder: "./drizzle" });
    const rows = await database.db.execute(
      sql`select count(*)::int as count from information_schema.tables where table_schema = 'public'`,
    );
    expect(rows.rows[0]?.count).toBe(14);
  });

  it("accepts all 20 fictional task fixtures and preserves reruns", async () => {
    await database.db
      .insert(schema.task)
      .values(buildDemoRecords().tasks)
      .onConflictDoNothing();
    await database.db
      .insert(schema.task)
      .values(buildDemoRecords().tasks)
      .onConflictDoNothing();
    expect(
      await database.db
        .select()
        .from(schema.task)
        .where(eq(schema.task.firmId, demoFirmId)),
    ).toHaveLength(20);
  });

  it("rejects a task referencing another firm's company", async () => {
    await expect(
      database.db.insert(schema.task).values({
        firmId: demoFirmId,
        companyId: otherCompany,
        title: "Invalid",
        dueDate: "2026-11-15",
      }),
    ).rejects.toThrow();
  });

  it("rejects a task assigned to a user outside its firm", async () => {
    await expect(
      database.db.insert(schema.task).values({
        firmId: otherFirm,
        companyId: otherCompany,
        assigneeId: demoUserId,
        title: "Invalid",
        dueDate: "2026-11-15",
      }),
    ).rejects.toThrow();
  });

  it("rejects completed tasks with missing or blank evidence", async () => {
    for (const completionEvidence of [null, "", "   "]) {
      await expect(
        database.db.insert(schema.task).values({
          firmId: demoFirmId,
          companyId: buildDemoRecords().companies[0]!.id,
          title: "Invalid completion",
          dueDate: "2026-11-15",
          status: "completed",
          completedAt: new Date(),
          completionEvidence,
        }),
      ).rejects.toThrow();
    }
  });

  it("rejects document links crossing companies even inside one firm", async () => {
    await expect(
      database.db.insert(schema.document).values({
        firmId: demoFirmId,
        companyId: buildDemoRecords().companies[1]!.id,
        taskId: buildDemoRecords().tasks[0]!.id,
        uploadedBy: demoUserId,
        objectKey: "test/cross-company",
        originalName: "sample.pdf",
        mediaType: "application/pdf",
        sizeBytes: 100,
      }),
    ).rejects.toThrow();
  });

  it("rejects duplicate company CIN within a firm but allows it in another firm", async () => {
    await database.db
      .insert(schema.company)
      .values({ firmId: demoFirmId, name: "First", cin: "SAMPLE-IDENTIFIER" });
    await expect(
      database.db.insert(schema.company).values({
        firmId: demoFirmId,
        name: "Duplicate",
        cin: "SAMPLE-IDENTIFIER",
      }),
    ).rejects.toThrow();
    await expect(
      database.db.insert(schema.company).values({
        firmId: otherFirm,
        name: "Separate firm",
        cin: "SAMPLE-IDENTIFIER",
      }),
    ).resolves.toBeDefined();
  });

  it("rolls back related writes after an invariant failure", async () => {
    const id = "20000000-0000-4000-8000-000000000088";
    await expect(
      database.db.transaction(async (tx) => {
        await tx
          .insert(schema.company)
          .values({ id, firmId: demoFirmId, name: "Must roll back" });
        await tx.insert(schema.task).values({
          firmId: otherFirm,
          companyId: id,
          title: "Cross-tenant",
          dueDate: "2026-11-15",
        });
      }),
    ).rejects.toThrow();
    expect(
      await database.db
        .select()
        .from(schema.company)
        .where(eq(schema.company.id, id)),
    ).toHaveLength(0);
  });
});
