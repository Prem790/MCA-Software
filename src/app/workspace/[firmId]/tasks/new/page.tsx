import Link from "next/link";
import {
  pageActor,
  pageRecord,
  pageResourceId,
} from "@/platform/auth/page-session";
import { companies, compliance, tasks } from "@/platform/application/services";
import { TaskForm } from "@/features/workspace/task-form";
export default async function NewTask({
  params,
  searchParams,
}: {
  params: Promise<{ firmId: string }>;
  searchParams: Promise<{ companyId?: string; obligationId?: string }>;
}) {
  const { firmId } = await params;
  const actor = await pageActor(firmId);
  if (actor.role === "staff")
    return (
      <section className="panel workspace-panel">
        <h1>Manager access required</h1>
        <p>Admins and managers create and assign tasks.</p>
      </section>
    );
  const query = await searchParams;
  const linked = query.obligationId
    ? await pageRecord(() =>
        compliance().detail(actor, pageResourceId(query.obligationId!)),
      )
    : undefined;
  const companyId =
    linked?.companyId ??
    (query.companyId ? pageResourceId(query.companyId) : undefined);
  const company = companyId
    ? (await pageRecord(() => companies().detail(actor, companyId))).company
    : undefined;
  if (company?.archivedAt)
    return (
      <section className="panel workspace-panel">
        <h1>Company archived</h1>
        <p>Restore the company before adding tasks.</p>
      </section>
    );
  if (linked && !linked.dueDateConfirmedAt)
    return (
      <section className="panel workspace-panel">
        <h1>Confirm the obligation first</h1>
        <Link href={`/workspace/${firmId}/obligations/${linked.id}`}>
          Open obligation
        </Link>
      </section>
    );
  const options = await tasks().options(actor);
  return (
    <>
      <Link href={`/workspace/${firmId}/tasks`} className="back-link">
        ← Tasks
      </Link>
      <section className="panel workspace-panel">
        <h1>New task{company ? ` · ${company.name}` : ""}</h1>
        {linked && (
          <p>
            Linked obligation: {linked.title} · confirmed due date{" "}
            {linked.dueDate}
          </p>
        )}
        <TaskForm
          firmId={firmId}
          options={options}
          companyId={company?.id}
          obligationId={linked?.id}
          defaults={
            linked
              ? {
                  title: linked.title,
                  description: linked.description,
                  dueDate: linked.dueDate,
                }
              : undefined
          }
        />
      </section>
    </>
  );
}
