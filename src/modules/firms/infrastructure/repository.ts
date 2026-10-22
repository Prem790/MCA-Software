import "server-only";
import { and, asc, eq } from "drizzle-orm";
import type { QueryDatabase } from "@/platform/database/types";
import { firm, membership } from "../schema";

export function firmRepository(db: QueryDatabase) {
  return {
    listForUser(userId: string) {
      return db
        .select({ id: firm.id, name: firm.name, role: membership.role })
        .from(membership)
        .innerJoin(firm, eq(firm.id, membership.firmId))
        .where(eq(membership.userId, userId))
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
          and(eq(membership.userId, userId), eq(membership.firmId, firmId)),
        )
        .limit(1);
      return row;
    },
  };
}
