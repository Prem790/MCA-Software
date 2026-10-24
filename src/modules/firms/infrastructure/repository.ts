import "server-only";
import { and, asc, eq, isNull } from "drizzle-orm";
import type { QueryDatabase } from "@/platform/database/types";
import { firm, membership } from "../schema";
import type { Actor } from "../domain/access";
import { ApplicationError } from "@/platform/http/errors";

// Lock order for work mutations: firm, active membership, company, work record.
// Team mutations take the same firm lock, so revocation cannot race a new write.
export async function lockCurrentMember(
  db: QueryDatabase,
  actor: Actor,
): Promise<Actor> {
  await db
    .select({ id: firm.id })
    .from(firm)
    .where(eq(firm.id, actor.firmId))
    .for("update");
  const [row] = await db
    .select()
    .from(membership)
    .where(
      and(
        eq(membership.firmId, actor.firmId),
        eq(membership.userId, actor.userId),
        isNull(membership.revokedAt),
      ),
    );
  if (!row) throw new ApplicationError("NOT_FOUND", "Workspace was not found.");
  return { firmId: row.firmId, userId: row.userId, role: row.role };
}

export function firmRepository(db: QueryDatabase) {
  return {
    listForUser(userId: string) {
      return db
        .select({ id: firm.id, name: firm.name, role: membership.role })
        .from(membership)
        .innerJoin(firm, eq(firm.id, membership.firmId))
        .where(and(eq(membership.userId, userId), isNull(membership.revokedAt)))
        .orderBy(asc(firm.name), asc(firm.id));
    },
    async member(userId: string, firmId: string) {
      const [row] = await db
        .select({
          userId: membership.userId,
          firmId: membership.firmId,
          role: membership.role,
          firmName: firm.name,
        })
        .from(membership)
        .innerJoin(firm, eq(firm.id, membership.firmId))
        .where(
          and(
            eq(membership.userId, userId),
            eq(membership.firmId, firmId),
            isNull(membership.revokedAt),
          ),
        )
        .limit(1);
      return row;
    },
  };
}
