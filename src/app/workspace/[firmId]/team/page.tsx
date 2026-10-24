import Link from "next/link";
import { pageActor } from "@/platform/auth/page-session";
import { teams } from "@/platform/application/services";
import { readEmailConfig } from "@/platform/email/configuration";
import { teamQuery } from "@/modules/firms/team-contracts";
import {
  InviteMember,
  TeamInvitations,
  TeamMembers,
} from "@/features/workspace/team";

export default async function TeamPage({
  params,
  searchParams,
}: {
  params: Promise<{ firmId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { firmId } = await params;
  const actor = await pageActor(firmId);
  if (actor.role !== "admin")
    return (
      <section className="panel workspace-panel">
        <h1>Administrator access required</h1>
        <p>
          Only your firm administrators can view and manage team membership.
        </p>
      </section>
    );
  const query = teamQuery.safeParse(await searchParams);
  if (!query.success)
    return (
      <section className="panel workspace-panel">
        <h1>Invalid page</h1>
        <Link href={`/workspace/${firmId}/team`}>Return to team</Link>
      </section>
    );
  const data = await teams().list(actor, query.data);
  const format = (value: Date) =>
    new Intl.DateTimeFormat("en-IN", {
      timeZone: "Asia/Kolkata",
      dateStyle: "medium",
      timeStyle: "short",
    }).format(value);
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">{actor.firmName} · admin</p>
          <h1>Team and access</h1>
          <p className="page-description">
            Invite colleagues and manage their access to this firm.
          </p>
        </div>
      </div>
      <InviteMember firmId={firmId} emailConfigured={!!readEmailConfig()} />
      <section className="panel workspace-panel">
        <h2>Active members</h2>
        <p>
          Keep at least one administrator. Removing access preserves historical
          assignments and documents.
        </p>
        <TeamMembers
          firmId={firmId}
          members={data.members}
          currentUserId={actor.userId}
        />
        <nav className="workspace-pagination" aria-label="Team pages">
          <span>Page {query.data.page} · 50 members per page</span>
          {query.data.page > 1 && (
            <Link href={`?page=${query.data.page - 1}`}>Previous page</Link>
          )}
          {data.hasMore && (
            <Link href={`?page=${query.data.page + 1}`}>Next page</Link>
          )}
        </nav>
      </section>
      <TeamInvitations
        firmId={firmId}
        invitations={data.invitations.map((invite) => ({
          id: invite.id,
          email: invite.email,
          role: invite.role,
          deliveryStatus: invite.deliveryStatus,
          expiresAt: format(invite.expiresAt),
          canCancel: !invite.acceptedAt && !invite.revokedAt,
          status: invite.status,
        }))}
      />
      <section className="panel workspace-panel">
        <h2>Latest 50 team events</h2>
        {data.activity.length ? (
          <ul className="workspace-activity">
            {data.activity.map((event) => (
              <li key={event.id}>
                <strong>
                  {event.action.replaceAll(".", " ").replaceAll("_", " ")}
                </strong>
                {event.actorName ?? "System"}
                <time dateTime={event.occurredAt.toISOString()}>
                  {format(event.occurredAt)} IST
                </time>
              </li>
            ))}
          </ul>
        ) : (
          <p>No team activity yet.</p>
        )}
      </section>
    </>
  );
}
