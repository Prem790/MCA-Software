import "server-only";
import { and, asc, count, eq, ilike, isNull } from "drizzle-orm";
import type { QueryDatabase } from "@/platform/database/types";
import { appendAudit } from "@/modules/audit";
import { company, companyDirector, director } from "../schema";
import type { CompanyRepository, WriteContext } from "../contracts";

export function companyRepository(db: QueryDatabase): CompanyRepository {
  const companyScope = (firmId: string, id: string) =>
    and(eq(company.firmId, firmId), eq(company.id, id));
  const linkScope = (firmId: string, companyId: string, id: string) =>
    and(
      eq(companyDirector.firmId, firmId),
      eq(companyDirector.companyId, companyId),
      eq(companyDirector.id, id),
    );
  const audit = (
    tx: QueryDatabase,
    context: WriteContext,
    action: string,
    id: string,
  ) =>
    appendAudit(tx, {
      firmId: context.firmId,
      actorId: context.userId,
      requestId: context.requestId,
      action,
      resourceType: "company",
      resourceId: id,
    });
  // Serializes director edits with archiving the parent company.
  const activeCompany = async (
    tx: QueryDatabase,
    firmId: string,
    id: string,
  ) => {
    const [row] = await tx
      .select({ id: company.id })
      .from(company)
      .where(and(companyScope(firmId, id), isNull(company.archivedAt)))
      .for("update");
    return row;
  };
  return {
    async list(firmId, query) {
      const where = and(
        eq(company.firmId, firmId),
        query.archived === "active" ? isNull(company.archivedAt) : undefined,
        query.q
          ? ilike(company.name, `%${query.q.replace(/[\\%_]/g, "\\$&")}%`)
          : undefined,
      );
      const items = await db
        .select()
        .from(company)
        .where(where)
        .orderBy(asc(company.name), asc(company.id))
        .limit(20)
        .offset((query.page - 1) * 20);
      const [total] = await db
        .select({ value: count() })
        .from(company)
        .where(where);
      return { items, total: total?.value ?? 0 };
    },
    async find(firmId, id) {
      const [row] = await db
        .select()
        .from(company)
        .where(companyScope(firmId, id))
        .limit(1);
      return row;
    },
    directors(firmId, companyId) {
      return db
        .select({
          id: companyDirector.id,
          directorId: director.id,
          name: director.name,
          din: director.din,
          designation: companyDirector.designation,
        })
        .from(companyDirector)
        .innerJoin(
          director,
          and(
            eq(director.id, companyDirector.directorId),
            eq(director.firmId, companyDirector.firmId),
          ),
        )
        .where(
          and(
            eq(companyDirector.firmId, firmId),
            eq(companyDirector.companyId, companyId),
          ),
        )
        .orderBy(asc(director.name), asc(companyDirector.id))
        .limit(100);
    },
    create(context, input) {
      return db.transaction(async (tx) => {
        const [row] = await tx
          .insert(company)
          .values({ ...input, firmId: context.firmId })
          .returning();
        if (!row) throw new Error("Company insert did not return a row");
        await audit(tx, context, "company.created", row.id);
        return row;
      });
    },
    update(context, id, input) {
      return db.transaction(async (tx) => {
        const [row] = await tx
          .update(company)
          .set(input)
          .where(
            and(companyScope(context.firmId, id), isNull(company.archivedAt)),
          )
          .returning();
        if (row) await audit(tx, context, "company.updated", id);
        return row;
      });
    },
    archive(context, id, archived) {
      return db.transaction(async (tx) => {
        const [current] = await tx
          .select()
          .from(company)
          .where(companyScope(context.firmId, id))
          .for("update");
        if (!current) return undefined;
        if (!!current.archivedAt === archived) return current;
        const [row] = await tx
          .update(company)
          .set({ archivedAt: archived ? new Date() : null })
          .where(companyScope(context.firmId, id))
          .returning();
        await audit(
          tx,
          context,
          archived ? "company.archived" : "company.restored",
          id,
        );
        return row;
      });
    },
    addDirector(context, companyId, input) {
      return db.transaction(async (tx) => {
        if (!(await activeCompany(tx, context.firmId, companyId)))
          return undefined;
        const [person] = await tx
          .insert(director)
          .values({ firmId: context.firmId, name: input.name, din: input.din })
          .returning();
        if (!person) throw new Error("Director insert did not return a row");
        const [link] = await tx
          .insert(companyDirector)
          .values({
            firmId: context.firmId,
            companyId,
            directorId: person.id,
            designation: input.designation,
          })
          .returning();
        if (!link) throw new Error("Director association did not return a row");
        await audit(tx, context, "company.director_added", companyId);
        return {
          id: link.id,
          directorId: person.id,
          name: person.name,
          din: person.din,
          designation: link.designation,
        };
      });
    },
    updateDirector(context, companyId, id, input) {
      return db.transaction(async (tx) => {
        if (!(await activeCompany(tx, context.firmId, companyId)))
          return undefined;
        const [link] = await tx
          .select()
          .from(companyDirector)
          .where(linkScope(context.firmId, companyId, id));
        if (!link) return undefined;
        const [person] = await tx
          .update(director)
          .set({ name: input.name, din: input.din })
          .where(
            and(
              eq(director.firmId, context.firmId),
              eq(director.id, link.directorId),
            ),
          )
          .returning();
        if (!person) return undefined;
        await tx
          .update(companyDirector)
          .set({ designation: input.designation })
          .where(linkScope(context.firmId, companyId, id));
        await audit(tx, context, "company.director_updated", companyId);
        return {
          id: link.id,
          directorId: person.id,
          name: person.name,
          din: person.din,
          designation: input.designation,
        };
      });
    },
    removeDirector(context, companyId, id) {
      return db.transaction(async (tx) => {
        if (!(await activeCompany(tx, context.firmId, companyId))) return false;
        const [row] = await tx
          .delete(companyDirector)
          .where(linkScope(context.firmId, companyId, id))
          .returning({ id: companyDirector.id });
        if (row)
          await audit(tx, context, "company.director_removed", companyId);
        return !!row;
      });
    },
  };
}
