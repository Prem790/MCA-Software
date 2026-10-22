"use client";

import { useState, type FormEvent } from "react";
import { Bell, Building2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, FieldLabel, PageHeading, Panel } from "./components";
import { PreviewAction } from "./preview-action";
import { team } from "./data";

export function SettingsView() {
  const [tab, setTab] = useState("firm");
  const [notice, setNotice] = useState("");
  function previewSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice("Settings previewed. No changes were saved or sent.");
  }
  return (
    <>
      <PageHeading
        eyebrow="MAKE IT YOUR WORKSPACE"
        title="Settings"
        description="Manage your firm’s information, team, and notification preferences."
      />
      <div className="settings-layout">
        <nav className="settings-nav" aria-label="Settings sections">
          {[
            { id: "firm", label: "Firm profile", icon: Building2 },
            { id: "team", label: "Team members", icon: Users },
            { id: "notifications", label: "Notifications", icon: Bell },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              aria-pressed={tab === id}
              className={tab === id ? "settings-nav-active" : ""}
              onClick={() => {
                setTab(id);
                setNotice("");
              }}
            >
              <Icon size={17} aria-hidden="true" />
              {label}
            </button>
          ))}
        </nav>
        <div>
          {tab === "firm" && (
            <Panel
              title="Firm profile"
              description="The details your team will see across the workspace."
            >
              <form onSubmit={previewSave} className="settings-form">
                <div className="firm-identity">
                  <span className="large-workspace-initials">DF</span>
                  <div>
                    <strong>Demo Firm</strong>
                    <p>Fictional practice · Preview workspace</p>
                  </div>
                </div>
                <div className="form-grid">
                  <FieldLabel label="Firm name">
                    <input
                      name="name"
                      defaultValue="Demo Firm"
                      required
                      maxLength={120}
                    />
                  </FieldLabel>
                  <FieldLabel label="Contact email">
                    <input
                      name="email"
                      type="email"
                      defaultValue="hello@example.test"
                      required
                    />
                  </FieldLabel>
                  <FieldLabel label="City">
                    <input name="city" defaultValue="Jaipur" maxLength={100} />
                  </FieldLabel>
                  <FieldLabel label="Time zone">
                    <select name="timezone" defaultValue="Asia/Kolkata">
                      <option value="Asia/Kolkata">
                        India Standard Time (UTC+05:30)
                      </option>
                      <option value="UTC">Coordinated Universal Time</option>
                    </select>
                  </FieldLabel>
                </div>
                <div className="settings-form-footer">
                  <span className="muted-note">
                    Preview edits reset when you reload.
                  </span>
                  <Button type="submit">Preview changes</Button>
                </div>
              </form>
            </Panel>
          )}
          {tab === "team" && (
            <Panel
              title="Team members"
              description="Sample roles for the first working release."
              action={
                <PreviewAction
                  label="Invite member"
                  description="Invite a team member by email and assign a role. No invitations are sent from this preview."
                />
              }
            >
              <div className="team-list">
                {team.map((person) => (
                  <div key={person.id}>
                    <Avatar {...person} />
                    <span>
                      <strong>{person.name}</strong>
                      <small>{person.email}</small>
                    </span>
                    <span className="outline-badge">{person.role}</span>
                  </div>
                ))}
              </div>
              <div className="panel-foot">
                These are fictional personas, not provisioned login accounts.
              </div>
            </Panel>
          )}
          {tab === "notifications" && (
            <Panel
              title="Notification preferences"
              description="Choose what you would like to hear about."
            >
              <form onSubmit={previewSave} className="settings-form">
                <div className="notification-options">
                  {[
                    {
                      title: "Upcoming deadlines",
                      note: "A reminder before an assignment is due.",
                    },
                    {
                      title: "Review requests",
                      note: "When work is ready for your review.",
                    },
                    {
                      title: "Document requests",
                      note: "When a requested document needs attention.",
                    },
                  ].map((item) => (
                    <label key={item.title}>
                      <span>
                        <strong>{item.title}</strong>
                        <small>{item.note}</small>
                      </span>
                      <input
                        type="checkbox"
                        defaultChecked
                        role="switch"
                        aria-label={item.title}
                      />
                    </label>
                  ))}
                </div>
                <div className="settings-form-footer">
                  <span className="muted-note">
                    No real notifications are delivered yet.
                  </span>
                  <Button type="submit">Preview preferences</Button>
                </div>
              </form>
            </Panel>
          )}
          {notice && (
            <p className="inline-success" role="status">
              {notice}
            </p>
          )}
        </div>
      </div>
    </>
  );
}
