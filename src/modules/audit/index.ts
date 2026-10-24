import "server-only";
import { and, desc, eq } from "drizzle-orm";
import type { QueryDatabase } from "@/platform/database/types";
import { user } from "@/modules/identity/schema";
import { auditEvent } from "./schema";

export async function appendAudit(
  db: QueryDatabase,
  event: typeof auditEvent.$inferInsert,
) {
  await db.insert(auditEvent).values(event);
}

export async function listAudit(
  db: QueryDatabase,
  firmId: string,
  resourceId: string,
) {
  return listResourceAudit(db, firmId, "company", resourceId);
}

export async function listResourceAudit(
  db: QueryDatabase,
  firmId: string,
  resourceType: "company" | "task" | "obligation",
  resourceId: string,
) {
  return db
    .select({
      id: auditEvent.id,
      action: auditEvent.action,
      actorId: auditEvent.actorId,
      actorName: user.name,
      occurredAt: auditEvent.occurredAt,
    })
    .from(auditEvent)
    .leftJoin(user, eq(user.id, auditEvent.actorId))
    .where(
      and(
        eq(auditEvent.firmId, firmId),
        eq(auditEvent.resourceType, resourceType),
        eq(auditEvent.resourceId, resourceId),
      ),
    )
    .orderBy(desc(auditEvent.occurredAt), desc(auditEvent.id))
    .limit(50);
}
