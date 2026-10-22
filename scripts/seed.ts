import { buildDemoRecords, demoFirmId, demoUserId } from "../src/demo/records";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "../src/platform/database/schema";
import { assertDemoSeedAllowed } from "./demo/records";

const url = assertDemoSeedAllowed(process.env);
const pool = new Pool({
  connectionString: url,
  max: 1,
  connectionTimeoutMillis: 5000,
  statement_timeout: 10000,
});
const db = drizzle(pool);
try {
  const records = buildDemoRecords();
  await db.transaction(async (tx) => {
    await tx
      .insert(schema.user)
      .values({
        id: demoUserId,
        name: "Demo Staff (Fictional)",
        email: "staff@example.test",
      })
      .onConflictDoNothing();
    await tx
      .insert(schema.firm)
      .values({ id: demoFirmId, name: "MCA Demonstration Firm (Fictional)" })
      .onConflictDoNothing();
    await tx
      .insert(schema.membership)
      .values({
        id: "11000000-0000-4000-8000-000000000001",
        firmId: demoFirmId,
        userId: demoUserId,
        role: "staff",
      })
      .onConflictDoNothing();
    await tx
      .insert(schema.company)
      .values(records.companies)
      .onConflictDoNothing();
    await tx
      .insert(schema.director)
      .values({
        id: "21000000-0000-4000-8000-000000000001",
        firmId: demoFirmId,
        name: "Alex Example (Fictional)",
      })
      .onConflictDoNothing();
    await tx
      .insert(schema.companyDirector)
      .values({
        id: "22000000-0000-4000-8000-000000000001",
        firmId: demoFirmId,
        companyId: records.companies[0]!.id,
        directorId: "21000000-0000-4000-8000-000000000001",
        designation: "Sample director",
      })
      .onConflictDoNothing();
    await tx
      .insert(schema.obligationTemplate)
      .values({
        id: "23000000-0000-4000-8000-000000000001",
        firmId: demoFirmId,
        name: "Sample document review",
        description:
          "Demonstration only. No verified legal applicability or deadline.",
      })
      .onConflictDoNothing();
    await tx
      .insert(schema.obligation)
      .values({
        id: "24000000-0000-4000-8000-000000000001",
        firmId: demoFirmId,
        companyId: records.companies[0]!.id,
        templateId: "23000000-0000-4000-8000-000000000001",
        title: "Sample review obligation",
        reportingPeriod: "Demo period",
        dueDate: "2026-11-15",
      })
      .onConflictDoNothing();
    await tx.insert(schema.task).values(records.tasks).onConflictDoNothing();
    await tx
      .insert(schema.auditEvent)
      .values({
        id: "40000000-0000-4000-8000-000000000001",
        firmId: demoFirmId,
        actorId: demoUserId,
        action: "demo.seeded",
        resourceType: "firm",
        resourceId: demoFirmId,
        requestId: "demo-seed",
      })
      .onConflictDoNothing();
  });
  console.info(
    "Demo seed applied: 5 fictional companies and 20 tasks. Existing records were preserved. No passwords, login accounts, or uploaded files were provisioned.",
  );
} catch {
  console.error(
    "Demo seed failed; transaction rolled back. Check migrations and target database. Credentials were not logged.",
  );
  process.exitCode = 1;
} finally {
  await pool.end();
}
