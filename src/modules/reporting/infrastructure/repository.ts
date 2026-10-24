import "server-only";
import { and, count, eq, gt } from "drizzle-orm";
import { firmRepository, lockCurrentMember, type Actor } from "@/modules/firms";
import { appendAudit } from "@/modules/audit";
import { auditEvent } from "@/modules/audit/schema";
import type { QueryDatabase } from "@/platform/database/types";
import { ApplicationError } from "@/platform/http/errors";
import {
  REPORT_LIMIT,
  MAX_CSV_BYTES,
  type ReportKind,
  type ReportQuery,
} from "../contracts";
import { dashboardRead } from "./dashboard";
import { calendarRead } from "./calendar";
import { reportWhere, rowCount, taskRows, obligationRows } from "./rows";
import { reportCsv } from "../domain/csv";
import type { DashboardQuery, CalendarQuery, ReportRow } from "../contracts";
function csvRows(kind: ReportKind, rows: ReportRow[]) {
  const common = ["ID", "Company", "Company archived", "Title", "Due date"];
  const headers =
    kind === "tasks"
      ? [...common, "Status", "Priority", "Assignee", "Assignee access removed"]
      : [...common, "Reporting period", "Due date confirmed"];
  return reportCsv(
    headers,
    rows.map((row) => {
      const values = [
        row.id,
        row.companyName,
        row.companyArchivedAt ? "Yes" : "No",
        row.title,
        row.dueDate,
      ];
      return kind === "tasks"
        ? [
            ...values,
            row.status,
            row.priority,
            row.assigneeName ?? "Unassigned",
            row.assigneeRevokedAt ? "Yes" : "No",
          ]
        : [...values, row.reportingPeriod, row.confirmed ? "Yes" : "No"];
    }),
  );
}
export function reportingRepository(db: QueryDatabase) {
  async function read<T>(
    actor: Actor,
    work: (tx: QueryDatabase, current: Actor) => Promise<T>,
  ) {
    return db.transaction(
      async (tx) => {
        const current = await firmRepository(tx).member(
          actor.userId,
          actor.firmId,
        );
        if (!current)
          throw new ApplicationError("NOT_FOUND", "Workspace was not found.");
        return work(tx, current);
      },
      { isolationLevel: "repeatable read", accessMode: "read only" },
    );
  }
  return {
    dashboard(actor: Actor, query: DashboardQuery, today: string) {
      return read(actor, (tx, current) =>
        dashboardRead(tx, current, query, today),
      );
    },
    calendar(actor: Actor, query: CalendarQuery) {
      return read(actor, (tx, current) => calendarRead(tx, current, query));
    },
    report(actor: Actor, kind: ReportKind, query: ReportQuery, today: string) {
      return read(actor, async (tx, current) => {
        const where = reportWhere(current, kind, query, today);
        const items =
          kind === "tasks"
            ? await taskRows(tx, where, 20, (query.page - 1) * 20)
            : await obligationRows(tx, where, 20, (query.page - 1) * 20);
        return { items, total: await rowCount(tx, kind, where) };
      });
    },
    async export(
      actor: Actor,
      kind: ReportKind,
      query: ReportQuery,
      today: string,
      requestId: string,
    ) {
      return db.transaction(async (tx) => {
        const current = await lockCurrentMember(tx, actor);
        if (current.role === "staff")
          throw new ApplicationError(
            "FORBIDDEN",
            "Only admins and managers can export reports.",
          );
        const [recent] = await tx
          .select({ total: count() })
          .from(auditEvent)
          .where(
            and(
              eq(auditEvent.firmId, actor.firmId),
              eq(auditEvent.actorId, actor.userId),
              eq(auditEvent.resourceType, "report"),
              gt(auditEvent.occurredAt, new Date(Date.now() - 60000)),
            ),
          );
        if ((recent?.total ?? 0) >= 5)
          throw new ApplicationError(
            "RATE_LIMITED",
            "Export limit reached. Wait a minute and try again.",
          );
        const where = reportWhere(current, kind, query, today);
        const items =
          kind === "tasks"
            ? await taskRows(tx, where, REPORT_LIMIT + 1)
            : await obligationRows(tx, where, REPORT_LIMIT + 1);
        if (items.length > REPORT_LIMIT)
          throw new ApplicationError(
            "CONFLICT",
            "More than 1,000 records match. Narrow the company, date or status filters before exporting.",
          );
        const content = csvRows(kind, items);
        if (Buffer.byteLength(content, "utf8") > MAX_CSV_BYTES)
          throw new ApplicationError(
            "CONFLICT",
            "This report is too large. Narrow the filters before exporting.",
          );
        await appendAudit(tx, {
          firmId: actor.firmId,
          actorId: actor.userId,
          requestId,
          action: `report.${kind}_exported`,
          resourceType: "report",
          resourceId: actor.firmId,
        });
        return {
          content,
          filename: `mca-${kind}-${today}.csv`,
          count: items.length,
        };
      });
    },
  };
}
