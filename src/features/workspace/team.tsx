"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import type { TeamMember } from "@/modules/firms/team-contracts";
import { memberRoleLabels } from "./navigation";
import { DataBadge, EmptyRecords } from "./data-views";
import { displayTimestamp } from "./data-display";
import { useWorkMutation } from "./use-work-mutation";
import { WorkFeedback } from "./work-feedback";

type InviteRow = {
  id: string;
  email: string;
  role: TeamMember["role"];
  expiresAt: string;
  status: string;
  deliveryStatus: string;
  canCancel: boolean;
};
const roles = ["admin", "manager", "staff"] as const;

function MemberActions({
  firmId,
  member,
  currentUserId,
}: {
  firmId: string;
  member: TeamMember;
  currentUserId: string;
}) {
  const [role, setRole] = useState(member.role);
  const [confirm, setConfirm] = useState<"role" | "remove" | null>(null);
  const mutation = useWorkMutation();
  const confirmButton = useRef<HTMLButtonElement>(null);
  const saveButton = useRef<HTMLButtonElement>(null);
  const removeButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (confirm) confirmButton.current?.focus();
  }, [confirm]);
  function cancel() {
    const trigger = confirm === "remove" ? removeButton : saveButton;
    setConfirm(null);
    // The trigger is re-enabled in the same render; focus it after that commit.
    requestAnimationFrame(() => trigger.current?.focus());
  }
  async function change() {
    if (!confirm) return;
    const remove = confirm === "remove";
    const leave =
      member.userId === currentUserId && (remove || role !== "admin");
    const result = await mutation.run(
      `/api/firms/${firmId}/team/${member.id}`,
      remove ? "DELETE" : "PATCH",
      remove ? undefined : { role },
      {
        successMessage: remove ? "Firm access removed." : "Role updated.",
        ...(leave ? { navigateTo: () => "/workspace" } : {}),
      },
    );
    if (result !== null) setConfirm(null);
  }
  return (
    <div className="team-member-actions">
      <div className="workspace-actions">
        <label className="field-label">
          <span className="sr-only">Role for {member.email}</span>
          <select
            value={role}
            onChange={(event) =>
              setRole(event.target.value as TeamMember["role"])
            }
            disabled={mutation.pending || !!confirm}
          >
            {roles.map((value) => (
              <option key={value} value={value}>
                {memberRoleLabels[value]}
              </option>
            ))}
          </select>
        </label>
        <Button
          ref={saveButton}
          size="sm"
          variant="outline"
          disabled={mutation.pending || role === member.role || !!confirm}
          onClick={() => setConfirm("role")}
        >
          Save role
        </Button>
        <Button
          className="danger-action"
          ref={removeButton}
          size="sm"
          variant="outline"
          disabled={mutation.pending || !!confirm}
          onClick={() => setConfirm("remove")}
        >
          Remove access
        </Button>
      </div>
      {confirm && (
        <div
          className="workflow-confirmation"
          role="group"
          aria-label={`Confirm access change for ${member.name}`}
        >
          <p>
            {confirm === "remove"
              ? `Remove ${member.name}’s access to this firm? Historical work, documents and other firm memberships are retained.`
              : `Change ${member.name}’s role from ${memberRoleLabels[member.role]} to ${memberRoleLabels[role]}? This changes what they can do in this firm.`}
            {member.userId === currentUserId
              ? " You are changing your own access. Losing administrator access returns you to your firms."
              : ""}
            {member.role === "admin" &&
              " At least one administrator must remain in the firm."}
          </p>
          <Button
            className={confirm === "remove" ? "danger-action" : undefined}
            ref={confirmButton}
            type="button"
            disabled={mutation.pending}
            onClick={change}
          >
            {mutation.pending
              ? "Saving…"
              : confirm === "remove"
                ? "Confirm removal"
                : "Confirm role change"}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={mutation.pending}
            onClick={cancel}
          >
            Keep current access
          </Button>
        </div>
      )}
      <WorkFeedback error={mutation.error} notice={mutation.notice} />
    </div>
  );
}

export function TeamMembers({
  firmId,
  members,
  currentUserId,
}: {
  firmId: string;
  members: TeamMember[];
  currentUserId: string;
}) {
  if (!members.length)
    return (
      <EmptyRecords title="No members on this page">
        Return to the previous page to see active members.
      </EmptyRecords>
    );
  return (
    <div
      className="table-scroll"
      role="region"
      aria-label="Team members table"
      tabIndex={0}
    >
      <table className="data-table workspace-data-table team-table">
        <caption className="sr-only">Active firm members</caption>
        <thead>
          <tr>
            <th scope="col">Member</th>
            <th scope="col">Current role</th>
            <th scope="col">Manage access</th>
          </tr>
        </thead>
        <tbody>
          {members.map((member) => (
            <tr key={member.id}>
              <td>
                <strong>{member.name}</strong>
                {member.userId === currentUserId && (
                  <span className="team-you">You</span>
                )}
                <span className="cell-secondary">{member.email}</span>
              </td>
              <td>
                <DataBadge value={member.role}>
                  {memberRoleLabels[member.role]}
                </DataBadge>
              </td>
              <td>
                <MemberActions
                  key={`${member.id}:${member.role}`}
                  firmId={firmId}
                  member={member}
                  currentUserId={currentUserId}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function InviteMember({
  firmId,
  emailConfigured,
}: {
  firmId: string;
  emailConfigured: boolean;
}) {
  const mutation = useWorkMutation();
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!emailConfigured) return;
    const element = event.currentTarget;
    const form = new FormData(element);
    const result = await mutation.run(
      `/api/firms/${firmId}/invitations`,
      "POST",
      {
        email: String(form.get("email")).trim(),
        role: String(form.get("role")),
      },
      {
        successMessage:
          "Invitation submitted to the email provider. The link expires in 72 hours. This does not confirm inbox delivery.",
      },
    );
    if (result !== null) element.reset();
  }
  return (
    <section className="panel workspace-panel">
      <h2>Invite a colleague</h2>
      <details className="role-guide-details">
        <summary>What each role can do</summary>
        <ul className="role-guide">
          <li>
            <strong>Administrators</strong> manage team access and work.
          </li>
          <li>
            <strong>Managers</strong> manage company records, work and reviews.
          </li>
          <li>
            <strong>Staff</strong> view firm records and update work assigned to
            them.
          </li>
        </ul>
      </details>
      {!emailConfigured && (
        <p className="workspace-readonly">
          Email invitations are unavailable until your operator configures email
          delivery. Existing accounts can still sign in. No invitation will be
          sent from this form.
        </p>
      )}
      <form
        onSubmit={submit}
        className="workspace-form workflow-form"
        aria-label="Invite colleague"
        aria-busy={mutation.pending}
      >
        <fieldset
          className="workflow-fields"
          disabled={!emailConfigured || mutation.pending}
        >
          <legend>Invitation details</legend>
          <div className="form-grid">
            <label className="field-label">
              Email address
              <input name="email" type="email" maxLength={254} required />
            </label>
            <label className="field-label">
              Role
              <select name="role" defaultValue="staff">
                {roles.map((value) => (
                  <option key={value} value={value}>
                    {memberRoleLabels[value]}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </fieldset>
        <WorkFeedback error={mutation.error} notice={mutation.notice} />
        {mutation.error && (
          <p className="workspace-note">
            An invitation may already have been recorded. Refresh the invitation
            list before retrying.
          </p>
        )}
        <Button type="submit" disabled={!emailConfigured || mutation.pending}>
          {mutation.pending ? "Sending…" : "Send invitation"}
        </Button>
      </form>
    </section>
  );
}

export function TeamInvitations({
  firmId,
  invitations,
}: {
  firmId: string;
  invitations: InviteRow[];
}) {
  const mutation = useWorkMutation();
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const confirmButton = useRef<HTMLButtonElement>(null);
  const trigger = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    if (confirmId) confirmButton.current?.focus();
  }, [confirmId]);
  function keepInvitation() {
    setConfirmId(null);
    requestAnimationFrame(() => trigger.current?.focus());
  }
  async function cancel(id: string) {
    const result = await mutation.run(
      `/api/firms/${firmId}/invitations/${id}`,
      "DELETE",
      undefined,
      { successMessage: "Invitation cancelled. Its link will no longer work." },
    );
    if (result !== null) setConfirmId(null);
  }
  return (
    <section className="panel workspace-panel">
      <h2>Latest 50 invitations</h2>
      <p>
        To resend, cancel the existing invitation and create another. Only the
        new link will work. Submitted means accepted by the provider, not
        confirmed inbox delivery.
      </p>
      <WorkFeedback error={mutation.error} notice={mutation.notice} />
      {invitations.length ? (
        <div
          className="table-scroll"
          role="region"
          aria-label="Invitations table"
          tabIndex={0}
        >
          <table className="data-table workspace-data-table">
            <caption className="sr-only">Recent invitations</caption>
            <thead>
              <tr>
                <th scope="col">Email / role</th>
                <th scope="col">Invitation</th>
                <th scope="col">Delivery</th>
                <th scope="col">Expires</th>
                <th scope="col">Action</th>
              </tr>
            </thead>
            <tbody>
              {invitations.map((invite) => (
                <tr key={invite.id}>
                  <td>
                    {invite.email}
                    <span className="cell-secondary">
                      {memberRoleLabels[invite.role]}
                    </span>
                  </td>
                  <td>
                    <DataBadge value={invite.status} />
                  </td>
                  <td>
                    <DataBadge value={invite.deliveryStatus} />
                  </td>
                  <td>
                    <time dateTime={invite.expiresAt}>
                      {displayTimestamp(new Date(invite.expiresAt))}
                    </time>
                  </td>
                  <td>
                    {invite.canCancel ? (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={mutation.pending || confirmId !== null}
                          onClick={(event) => {
                            trigger.current = event.currentTarget;
                            setConfirmId(invite.id);
                          }}
                        >
                          Cancel invitation
                        </Button>
                        {confirmId === invite.id && (
                          <div className="workflow-confirmation">
                            <p>
                              Cancel the invitation for {invite.email}? Its link
                              will stop working.
                            </p>
                            <Button
                              ref={confirmButton}
                              type="button"
                              disabled={mutation.pending}
                              onClick={() => cancel(invite.id)}
                            >
                              {mutation.pending
                                ? "Cancelling…"
                                : "Confirm cancellation"}
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              disabled={mutation.pending}
                              onClick={keepInvitation}
                            >
                              Keep invitation
                            </Button>
                          </div>
                        )}
                      </>
                    ) : (
                      <span className="data-muted">No action available</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyRecords title="No invitations yet">
          Invitations and delivery status will appear here when your firm sends
          them.
        </EmptyRecords>
      )}
    </section>
  );
}
