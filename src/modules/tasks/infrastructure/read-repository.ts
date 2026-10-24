import "server-only";
import { and, asc, count, desc, eq, isNull } from "drizzle-orm";
import { company } from "@/modules/companies/schema";
import { obligation } from "@/modules/compliance/schema";
import { membership } from "@/modules/firms/schema";
import { user } from "@/modules/identity/schema";
import type { QueryDatabase } from "@/platform/database/types";
import { ApplicationError } from "@/platform/http/errors";
import { taskWhere } from "./query";
import { task, taskChecklist, taskComment } from "../schema";
import type { TaskListItem, TaskRecord, TaskRepository } from "../contracts";

export function taskReads(
  db: QueryDatabase,
): Pick<TaskRepository, "options" | "list" | "detail"> {
  const joined = () =>
    db
      .select({
        task,
        companyName: company.name,
        companyArchivedAt: company.archivedAt,
        assigneeName: user.name,
        assigneeRevokedAt: membership.revokedAt,
        obligationTitle: obligation.title,
      })
      .from(task)
      .innerJoin(
        company,
        and(eq(company.id, task.companyId), eq(company.firmId, task.firmId)),
      )
      .leftJoin(user, eq(user.id, task.assigneeId))
      .leftJoin(
        membership,
        and(
          eq(membership.firmId, task.firmId),
          eq(membership.userId, task.assigneeId),
        ),
      )
      .leftJoin(
        obligation,
        and(
          eq(obligation.id, task.obligationId),
          eq(obligation.firmId, task.firmId),
          eq(obligation.companyId, task.companyId),
        ),
      );
  const flatten = (
    row: { task: TaskRecord } & Omit<TaskListItem, keyof TaskRecord>,
  ) => ({
    ...row.task,
    companyName: row.companyName,
    companyArchivedAt: row.companyArchivedAt,
    assigneeName: row.assigneeName,
    assigneeRevokedAt: row.assigneeRevokedAt,
    obligationTitle: row.obligationTitle,
  });
  return {
    async options(firmId) {
      const companies = await db
        .select({ id: company.id, name: company.name })
        .from(company)
        .where(and(eq(company.firmId, firmId), isNull(company.archivedAt)))
        .orderBy(asc(company.name), asc(company.id))
        .limit(201);
      const members = await db
        .select({ id: user.id, name: user.name })
        .from(membership)
        .innerJoin(user, eq(user.id, membership.userId))
        .where(and(eq(membership.firmId, firmId), isNull(membership.revokedAt)))
        .orderBy(asc(user.name), asc(user.id))
        .limit(201);
      return {
        companies: companies.slice(0, 200),
        members: members.slice(0, 200),
        limited: companies.length > 200 || members.length > 200,
      };
    },
    async list(actor, query, today) {
      const where = taskWhere(actor, query, today);
      const rows = await joined()
        .where(where)
        .orderBy(asc(task.dueDate), asc(task.id))
        .limit(20)
        .offset((query.page - 1) * 20);
      const [total] = await db
        .select({ value: count() })
        .from(task)
        .innerJoin(
          company,
          and(eq(company.id, task.companyId), eq(company.firmId, task.firmId)),
        )
        .where(where);
      return { items: rows.map(flatten), total: total?.value ?? 0 };
    },
    async detail(firmId, id, commentPage) {
      const [row] = await joined().where(
        and(eq(task.firmId, firmId), eq(task.id, id)),
      );
      if (!row) throw new ApplicationError("NOT_FOUND", "Task was not found.");
      const checklist = await db
        .select({
          id: taskChecklist.id,
          title: taskChecklist.title,
          checked: taskChecklist.checked,
        })
        .from(taskChecklist)
        .where(
          and(eq(taskChecklist.firmId, firmId), eq(taskChecklist.taskId, id)),
        )
        .orderBy(asc(taskChecklist.createdAt), asc(taskChecklist.id))
        .limit(50);
      const comments = await db
        .select({
          id: taskComment.id,
          body: taskComment.body,
          createdAt: taskComment.createdAt,
          authorName: user.name,
        })
        .from(taskComment)
        .innerJoin(user, eq(user.id, taskComment.authorId))
        .where(and(eq(taskComment.firmId, firmId), eq(taskComment.taskId, id)))
        .orderBy(desc(taskComment.createdAt), desc(taskComment.id))
        .limit(20)
        .offset((commentPage - 1) * 20);
      const [total] = await db
        .select({ value: count() })
        .from(taskComment)
        .where(and(eq(taskComment.firmId, firmId), eq(taskComment.taskId, id)));
      return {
        task: flatten(row),
        checklist,
        comments,
        commentTotal: total?.value ?? 0,
      };
    },
  };
}
