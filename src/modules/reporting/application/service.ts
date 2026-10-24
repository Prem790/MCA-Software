import "server-only";
import type { Actor } from "@/modules/firms";
import { indiaToday } from "@/lib/work-dates";
import { ApplicationError } from "@/platform/http/errors";
import type { reportingRepository } from "../infrastructure/repository";
import {
  calendarQuery,
  dashboardQuery,
  reportKind,
  reportQuery,
  type CalendarQuery,
  type ReportKind,
} from "../contracts";
function filters(kind: ReportKind, value: unknown) {
  const query = reportQuery.parse(value);
  if (
    kind === "obligations" &&
    (query.status !== "all" ||
      query.priority !== "all" ||
      query.assigneeId ||
      query.obligationId ||
      query.reviewer !== "all")
  )
    throw new ApplicationError(
      "VALIDATION_ERROR",
      "Task-only filters cannot be applied to obligation reports.",
    );
  return query;
}
export function reportingService(
  repository: ReturnType<typeof reportingRepository>,
  clock: () => Date = () => new Date(),
) {
  return {
    dashboard(actor: Actor, value: unknown = {}) {
      return repository.dashboard(
        actor,
        dashboardQuery.parse(value),
        indiaToday(clock()),
      );
    },
    calendar(actor: Actor, value: unknown = {}) {
      const query = calendarQuery.parse(value);
      const today = indiaToday(clock());
      const month = query.month ?? query.day?.slice(0, 7) ?? today.slice(0, 7);
      const day =
        query.day ?? (today.startsWith(month + "-") ? today : month + "-01");
      return repository.calendar(actor, {
        ...query,
        month,
        day,
      } satisfies CalendarQuery);
    },
    report(actor: Actor, kindValue: string, value: unknown = {}) {
      const kind = reportKind.parse(kindValue);
      return repository.report(
        actor,
        kind,
        filters(kind, value),
        indiaToday(clock()),
      );
    },
    export(actor: Actor, kindValue: string, value: unknown, requestId: string) {
      const kind = reportKind.parse(kindValue);
      return repository.export(
        actor,
        kind,
        filters(kind, value),
        indiaToday(clock()),
        requestId,
      );
    },
  };
}
