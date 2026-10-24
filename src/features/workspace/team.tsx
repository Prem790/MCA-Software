"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import type { TeamMember } from "@/modules/firms/team-contracts";
import { workspaceRequest } from "./api-client";

type InviteRow = {
  id: string;
  email: string;
  role: string;
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
  const router = useRouter();
  const [role, setRole] = useState(member.role);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function change(remove: boolean) {
    if (
      !window.confirm(
        remove
          ? `Remove ${member.name}'s access to this firm?`
          : `Change ${member.name}'s role to ${role}?`,
      )
    )
      return;
    setPending(true);
    setError("");
    try {
      await workspaceRequest(
        `/api/firms/${firmId}/team/${member.id}`,
        remove ? "DELETE" : "PATCH",
        remove ? undefined : { role },
      );
      if (member.userId === currentUserId && (remove || role !== "admin"))
        router.replace("/workspace");
      router.refresh();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Could not update this member.",
      );
    } finally {
      setPending(false);
    }
  }
  return (
    <>
      <div className="workspace-actions">
        <label>
          <span className="sr-only">Role for {member.email}</span>
          <select
            value={role}
            onChange={(event) =>
              setRole(event.target.value as TeamMember["role"])
            }
            disabled={pending}
          >
            {roles.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
        <Button
          size="sm"
          variant="outline"
          disabled={pending || role === member.role}
          onClick={() => change(false)}
        >
          Save role
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() => change(true)}
        >
          Remove access
        </Button>
      </div>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </>
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
  return (
    <div className="table-scroll">
      <table className="data-table">
        <caption className="sr-only">Active firm members</caption>
        <thead>
          <tr>
            <th scope="col">Member</th>
            <th scope="col">Email</th>
            <th scope="col">Access</th>
          </tr>
        </thead>
        <tbody>
          {members.map((member) => (
            <tr key={member.id}>
              <td>
                {member.name}
                {member.userId === currentUserId ? " (you)" : ""}
              </td>
              <td>{member.email}</td>
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
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const element = event.currentTarget;
    const form = new FormData(element);
    setPending(true);
    setError("");
    setMessage("");
    try {
      await workspaceRequest(`/api/firms/${firmId}/invitations`, "POST", {
        email: String(form.get("email")).trim(),
        role: String(form.get("role")),
      });
      element.reset();
      setMessage(
        "Invitation submitted to the email provider. The link expires in 72 hours.",
      );
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Could not invite this member.",
      );
    } finally {
      setPending(false);
      router.refresh();
    }
  }
  return (
    <section className="panel workspace-panel">
      <h2>Invite a colleague</h2>
      <p>
        Admins manage the team. Managers can edit company records. Staff can
        view them.
      </p>
      {!emailConfigured && (
        <p className="workspace-readonly">
          Email is not configured. Your operator must configure Resend before
          invitations and password recovery can send email.
        </p>
      )}
      <form onSubmit={submit} className="workspace-form">
        <label className="field-label">
          Email address
          <input
            name="email"
            type="email"
            maxLength={254}
            required
            disabled={!emailConfigured || pending}
          />
        </label>
        <label className="field-label">
          Role
          <select
            name="role"
            defaultValue="staff"
            disabled={!emailConfigured || pending}
          >
            {roles.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
        </label>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        {message && (
          <p className="workspace-readonly" role="status">
            {message}
          </p>
        )}
        <Button type="submit" disabled={!emailConfigured || pending}>
          {pending ? "Sending…" : "Send invitation"}
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
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState("");
  async function cancel(id: string) {
    if (!window.confirm("Cancel this invitation? Its link will stop working."))
      return;
    setPending(id);
    setError("");
    try {
      await workspaceRequest(
        `/api/firms/${firmId}/invitations/${id}`,
        "DELETE",
      );
      router.refresh();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Could not cancel this invitation.",
      );
    } finally {
      setPending(null);
    }
  }
  return (
    <section className="panel workspace-panel">
      <h2>Latest 50 invitations</h2>
      <p>
        To resend, cancel the existing invitation and create another. Only the
        new link will work. “Submitted” means accepted by the provider, not
        confirmed inbox delivery.
      </p>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {invitations.length ? (
        <div className="table-scroll">
          <table className="data-table">
            <caption className="sr-only">Recent invitations</caption>
            <thead>
              <tr>
                <th scope="col">Email / role</th>
                <th scope="col">Status</th>
                <th scope="col">Email</th>
                <th scope="col">Expires (IST)</th>
                <th scope="col">Action</th>
              </tr>
            </thead>
            <tbody>
              {invitations.map((invite) => (
                <tr key={invite.id}>
                  <td>
                    {invite.email}
                    <br />
                    {invite.role}
                  </td>
                  <td>{invite.status}</td>
                  <td>{invite.deliveryStatus}</td>
                  <td>{invite.expiresAt}</td>
                  <td>
                    {invite.canCancel && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={pending !== null}
                        onClick={() => cancel(invite.id)}
                      >
                        {pending === invite.id ? "Cancelling…" : "Cancel"}
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p>No invitations yet.</p>
      )}
    </section>
  );
}
