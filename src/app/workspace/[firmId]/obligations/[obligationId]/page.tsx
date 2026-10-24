import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  pageActor,
  pageRecord,
  pageResourceId,
} from "@/platform/auth/page-session";
import { compliance, tasks } from "@/platform/application/services";
import { getDatabase } from "@/platform/database/client";
import { listResourceAudit } from "@/modules/audit";
import { nextOccurrenceDate } from "@/modules/compliance";
import {
  ObligationForm,
  NextOccurrenceForm,
} from "@/features/workspace/obligation-form";
import { TaskTable } from "@/features/workspace/work-tables";
import { WorkHistory } from "@/features/workspace/work-history";
export default async function ObligationPage({
  params,
}: {
  params: Promise<{ firmId: string; obligationId: string }>;
}) {
  const { firmId, obligationId } = await params;
  const actor = await pageActor(firmId);
  const record = await pageRecord(() =>
    compliance().detail(actor, pageResourceId(obligationId)),
  );
  const linked = await tasks().list(actor, { obligationId, archived: "all" });
  const events = await listResourceAudit(
    getDatabase(),
    firmId,
    "obligation",
    obligationId,
  );
  const writable = actor.role !== "staff" && !record.companyArchivedAt;
  let suggested: string | null = null;
  try {
    if (record.anchorDueDate)
      suggested = nextOccurrenceDate(
        record.anchorDueDate,
        record.recurrence,
        record.occurrenceNumber,
      );
  } catch {
    /* Series may reach the supported date boundary; do not offer an invalid date. */
  }
  return (
    <>
      <Link className="back-link" href={`/workspace/${firmId}/obligations`}>
        ← Obligations
      </Link>
      <div className="page-heading">
        <div>
          <p className="eyebrow">{record.companyName}</p>
          <h1>{record.title}</h1>
          <p className="page-description">
            {record.reportingPeriod} · due {record.dueDate} ·{" "}
            {record.recurrence}
          </p>
        </div>
        {writable && record.dueDateConfirmedAt && (
          <Button asChild>
            <Link
              href={`/workspace/${firmId}/tasks/new?obligationId=${record.id}`}
            >
              Create task
            </Link>
          </Button>
        )}
      </div>
      {record.companyArchivedAt && (
        <p className="workspace-readonly">
          The company is archived. Restore it before changing work records.
        </p>
      )}
      {!record.dueDateConfirmedAt && (
        <p className="workspace-readonly">
          This deadline has not been confirmed. An admin or manager must confirm
          it before creating linked tasks.
        </p>
      )}
      <div className="workspace-detail-grid">
        <section className="panel workspace-panel">
          <h2>Obligation details</h2>
          {writable ? (
            <ObligationForm
              key={record.version}
              firmId={firmId}
              obligation={record}
            />
          ) : (
            <>
              <p className="work-preserve">
                {record.description || "No instructions provided."}
              </p>
              <p>Confirmed: {record.dueDateConfirmedAt ? "Yes" : "No"}</p>
            </>
          )}
          <Link
            className="text-link"
            href={`/workspace/${firmId}/companies/${record.companyId}`}
          >
            Open company
          </Link>
        </section>
        <WorkHistory events={events} />
      </div>
      {writable && suggested && (
        <section className="panel workspace-panel">
          <h2>Next recurring occurrence</h2>
          <NextOccurrenceForm
            firmId={firmId}
            obligationId={record.id}
            suggestedDate={suggested}
          />
        </section>
      )}
      <section className="panel workspace-panel">
        <h2>Linked tasks · {linked.total}</h2>
        <TaskTable firmId={firmId} items={linked.items} />
        {linked.total > 20 && (
          <Link
            className="text-link"
            href={`/workspace/${firmId}/tasks?obligationId=${record.id}&archived=all`}
          >
            View all linked tasks
          </Link>
        )}
      </section>
    </>
  );
}
