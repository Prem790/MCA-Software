import "server-only";
import { and, eq, isNull } from "drizzle-orm";
import type { QueryDatabase } from "@/platform/database/types";
import { company } from "../schema";
export async function lockActiveCompany(
  db: QueryDatabase,
  firmId: string,
  companyId: string,
) {
  const [row] = await db
    .select()
    .from(company)
    .where(
      and(
        eq(company.firmId, firmId),
        eq(company.id, companyId),
        isNull(company.archivedAt),
      ),
    )
    .for("update");
  return row;
}
