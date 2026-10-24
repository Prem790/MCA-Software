import "server-only";
import { randomUUID } from "node:crypto";
import { and, asc, count, eq, isNull } from "drizzle-orm";
import { lockCurrentMember } from "@/modules/firms";
import { lockActiveCompany } from "@/modules/companies";
import { company } from "@/modules/companies/schema";
import { appendAudit } from "@/modules/audit";
import type { QueryDatabase } from "@/platform/database/types";
import { ApplicationError } from "@/platform/http/errors";
import { obligationWhere } from "./query";
import { obligation, obligationTemplate } from "../schema";
import type { ComplianceRepository, WorkContext } from "../contracts";

const missing = () =>
  new ApplicationError("NOT_FOUND", "Obligation or company was not found.");
async function writeContext(
  db: QueryDatabase,
  context: WorkContext,
  companyId?: string,
) {
  const current = await lockCurrentMember(db, context);
  if (current.role === "staff")
    throw new ApplicationError(
      "FORBIDDEN",
      "Only admins and managers can manage obligations.",
    );
  if (companyId && !(await lockActiveCompany(db, context.firmId, companyId)))
    throw missing();
}
async function audit(
  db: QueryDatabase,
  context: WorkContext,
  action: string,
  id: string,
) {
  await appendAudit(db, {
    firmId: context.firmId,
    actorId: context.userId,
    requestId: context.requestId,
    resourceType: "obligation",
    resourceId: id,
    action,
  });
}

export function complianceRepository(db: QueryDatabase): ComplianceRepository {
  const scope = (firmId: string, id: string) =>
    and(eq(obligation.firmId, firmId), eq(obligation.id, id));
  const joined = () =>
    db
      .select({
        obligation,
        companyName: company.name,
        companyArchivedAt: company.archivedAt,
      })
      .from(obligation)
      .innerJoin(
        company,
        and(
          eq(company.firmId, obligation.firmId),
          eq(company.id, obligation.companyId),
        ),
      );
  return {
    async templates(firmId, page) {
      const items = await db
        .select()
        .from(obligationTemplate)
        .where(eq(obligationTemplate.firmId, firmId))
        .orderBy(asc(obligationTemplate.name), asc(obligationTemplate.id))
        .limit(20)
        .offset((page - 1) * 20);
      const [total] = await db
        .select({ value: count() })
        .from(obligationTemplate)
        .where(eq(obligationTemplate.firmId, firmId));
      return { items, total: total?.value ?? 0 };
    },
    async saveTemplate(context, input, id) {
      return db.transaction(async (tx) => {
        await writeContext(tx, context);
        if (id) {
          const [current] = await tx
            .select()
            .from(obligationTemplate)
            .where(
              and(
                eq(obligationTemplate.firmId, context.firmId),
                eq(obligationTemplate.id, id),
                isNull(obligationTemplate.archivedAt),
              ),
            );
          if (!current) throw missing();
          if (current.version !== input.version)
            throw new ApplicationError(
              "CONFLICT",
              "This template changed. Refresh before saving again.",
            );
        }
        const [row] = id
          ? await tx
              .update(obligationTemplate)
              .set({
                name: input.name,
                description: input.description,
                version: input.version! + 1,
              })
              .where(
                and(
                  eq(obligationTemplate.firmId, context.firmId),
                  eq(obligationTemplate.id, id),
                  isNull(obligationTemplate.archivedAt),
                ),
              )
              .returning()
          : await tx
              .insert(obligationTemplate)
              .values({ ...input, firmId: context.firmId })
              .returning();
        if (!row) throw missing();
        await audit(
          tx,
          context,
          id ? "template.updated" : "template.created",
          row.id,
        );
        return row;
      });
    },
    async template(firmId, id) {
      const [row] = await db
        .select()
        .from(obligationTemplate)
        .where(
          and(
            eq(obligationTemplate.firmId, firmId),
            eq(obligationTemplate.id, id),
            isNull(obligationTemplate.archivedAt),
          ),
        );
      if (!row)
        throw new ApplicationError(
          "NOT_FOUND",
          "Active template was not found.",
        );
      return row;
    },
    async archiveTemplate(context, id) {
      await db.transaction(async (tx) => {
        await writeContext(tx, context);
        const [row] = await tx
          .update(obligationTemplate)
          .set({ archivedAt: new Date() })
          .where(
            and(
              eq(obligationTemplate.firmId, context.firmId),
              eq(obligationTemplate.id, id),
              isNull(obligationTemplate.archivedAt),
            ),
          )
          .returning();
        if (!row) throw missing();
        await audit(tx, context, "template.archived", id);
      });
    },
    async list(firmId, query, today) {
      const where = obligationWhere(firmId, query, today);
      const rows = await joined()
        .where(where)
        .orderBy(asc(obligation.dueDate), asc(obligation.id))
        .limit(20)
        .offset((query.page - 1) * 20);
      const [total] = await db
        .select({ value: count() })
        .from(obligation)
        .innerJoin(
          company,
          and(
            eq(company.id, obligation.companyId),
            eq(company.firmId, obligation.firmId),
          ),
        )
        .where(where);
      return {
        items: rows.map((row) => ({
          ...row.obligation,
          companyName: row.companyName,
          companyArchivedAt: row.companyArchivedAt,
        })),
        total: total?.value ?? 0,
      };
    },
    async detail(firmId, id) {
      const [row] = await joined().where(scope(firmId, id)).limit(1);
      if (!row) throw missing();
      return {
        ...row.obligation,
        companyName: row.companyName,
        companyArchivedAt: row.companyArchivedAt,
      };
    },
    async create(context, input) {
      return db.transaction(async (tx) => {
        await writeContext(tx, context, input.companyId);
        if (input.templateId) {
          const [template] = await tx
            .select({ id: obligationTemplate.id })
            .from(obligationTemplate)
            .where(
              and(
                eq(obligationTemplate.firmId, context.firmId),
                eq(obligationTemplate.id, input.templateId),
                isNull(obligationTemplate.archivedAt),
              ),
            );
          if (!template)
            throw new ApplicationError(
              "NOT_FOUND",
              "Active template was not found.",
            );
        }
        const [row] = await tx
          .insert(obligation)
          .values({
            companyId: input.companyId,
            templateId: input.templateId,
            title: input.title,
            description: input.description,
            reportingPeriod: input.reportingPeriod,
            dueDate: input.dueDate,
            recurrence: input.recurrence,
            firmId: context.firmId,
            dueDateConfirmedAt: new Date(),
            seriesId: randomUUID(),
            anchorDueDate: input.dueDate,
          })
          .returning();
        if (!row) throw missing();
        await audit(tx, context, "obligation.created", row.id);
        return row;
      });
    },
    async update(context, id, input) {
      return db.transaction(async (tx) => {
        // Locate scope before locking; repeat lookup after the firm/company locks.
        const [initial] = await tx
          .select({ companyId: obligation.companyId })
          .from(obligation)
          .where(scope(context.firmId, id));
        if (!initial) throw missing();
        await writeContext(tx, context, initial.companyId);
        const { version } = input;
        const [row] = await tx
          .update(obligation)
          .set({
            title: input.title,
            description: input.description,
            reportingPeriod: input.reportingPeriod,
            dueDate: input.dueDate,
            dueDateConfirmedAt: new Date(),
            version: version + 1,
          })
          .where(
            and(scope(context.firmId, id), eq(obligation.version, version)),
          )
          .returning();
        if (!row)
          throw new ApplicationError(
            "CONFLICT",
            "This obligation changed. Refresh before saving again.",
          );
        await audit(tx, context, "obligation.updated", id);
        return row;
      });
    },
    async next(context, id, input) {
      return db.transaction(async (tx) => {
        const [initial] = await tx
          .select({ companyId: obligation.companyId })
          .from(obligation)
          .where(scope(context.firmId, id));
        if (!initial) throw missing();
        await writeContext(tx, context, initial.companyId);
        const [source] = await tx
          .select()
          .from(obligation)
          .where(scope(context.firmId, id))
          .for("update");
        if (
          !source ||
          source.recurrence === "none" ||
          !source.seriesId ||
          !source.anchorDueDate
        )
          throw new ApplicationError(
            "CONFLICT",
            "This obligation has no recurring series.",
          );
        const [existing] = await tx
          .select()
          .from(obligation)
          .where(
            and(
              eq(obligation.firmId, context.firmId),
              eq(obligation.companyId, source.companyId),
              eq(obligation.seriesId, source.seriesId),
              eq(obligation.occurrenceNumber, source.occurrenceNumber + 1),
            ),
          );
        if (existing) return { obligation: existing, alreadyExists: true };
        if (input.dueDate <= source.dueDate)
          throw new ApplicationError(
            "VALIDATION_ERROR",
            "The next occurrence must be after this occurrence's due date.",
          );
        const [row] = await tx
          .insert(obligation)
          .values({
            firmId: context.firmId,
            companyId: source.companyId,
            templateId: source.templateId,
            title: source.title,
            description: source.description,
            dueDate: input.dueDate,
            reportingPeriod: input.reportingPeriod,
            dueDateConfirmedAt: new Date(),
            recurrence: source.recurrence,
            seriesId: source.seriesId,
            anchorDueDate: source.anchorDueDate,
            occurrenceNumber: source.occurrenceNumber + 1,
          })
          .returning();
        if (!row) throw missing();
        await audit(tx, context, "obligation.next_created", row.id);
        return { obligation: row, alreadyExists: false };
      });
    },
  };
}
