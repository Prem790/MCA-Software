"use client";

import { useState, type FormEvent } from "react";
import { MessageSquare, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Panel } from "./components";
import type { PreviewTask } from "./data";

const steps = [
  "Collect supporting information",
  "Check details against company records",
  "Prepare the review draft",
  "Send to manager for review",
];

export function TaskInteraction({ task }: { task: PreviewTask }) {
  const initial =
    task.status === "completed"
      ? [true, true, true, true]
      : [true, true, false, false];
  const [checked, setChecked] = useState(initial);
  const [comments, setComments] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const done = checked.filter(Boolean).length;
  function addComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = message.trim();
    if (!value) {
      setError("Write a comment before adding it.");
      return;
    }
    setComments([...comments, value]);
    setMessage("");
    setError("");
  }
  return (
    <>
      <Panel
        title="Preparation checklist"
        description={`${done} of ${steps.length} items checked`}
      >
        <div className="checklist">
          {steps.map((step, index) => (
            <label key={step}>
              <input
                type="checkbox"
                checked={checked[index]}
                onChange={(event) => {
                  setChecked(
                    checked.map((value, i) =>
                      i === index ? event.target.checked : value,
                    ),
                  );
                  setSubmitted(false);
                }}
              />
              <span>{step}</span>
            </label>
          ))}
        </div>
        <div className="checklist-footer">
          <span className="muted-note">
            Preview interactions reset when you leave or reload.
          </span>
          <Button
            size="sm"
            disabled={done < steps.length || submitted}
            onClick={() => setSubmitted(true)}
          >
            Simulate review request
          </Button>
        </div>
        {submitted && (
          <p className="inline-success" role="status">
            Review request previewed. Nothing was saved or sent.
          </p>
        )}
      </Panel>
      <Panel
        title="Discussion"
        description="Keep questions alongside the work."
      >
        <div className="discussion-example">
          <span className="avatar tone-blue">JL</span>
          <div>
            <strong>
              Jordan Lee <small>Sample manager</small>
            </strong>
            <p>
              Please confirm the supporting details before preparing the review
              draft.
            </p>
            <span>Sample comment · 21 Oct</span>
          </div>
        </div>
        {comments.map((comment, index) => (
          <div key={index} className="discussion-example">
            <span className="avatar tone-teal">ST</span>
            <div>
              <strong>
                You <small>Local preview only</small>
              </strong>
              <p>{comment}</p>
            </div>
          </div>
        ))}
        <form onSubmit={addComment} className="comment-form">
          <label htmlFor="preview-comment" className="sr-only">
            Your sample comment
          </label>
          <textarea
            id="preview-comment"
            placeholder="Add a sample comment…"
            value={message}
            maxLength={500}
            onChange={(event) => {
              setMessage(event.target.value);
              setError("");
            }}
            aria-describedby={error ? "comment-error" : "comment-note"}
            aria-invalid={!!error}
            rows={3}
          />
          <div className="comment-actions">
            <span id="comment-note" className="muted-note">
              Not saved or shared with anyone.
            </span>
            <Button type="submit" size="sm">
              <MessageSquare size={14} aria-hidden="true" />
              Add preview comment
            </Button>
          </div>
          {error && (
            <p id="comment-error" role="alert" className="overdue-text">
              {error}
            </p>
          )}
        </form>
        {(comments.length > 0 ||
          submitted ||
          checked.some((value, index) => value !== initial[index])) && (
          <button
            type="button"
            className="text-link reset-preview"
            onClick={() => {
              setChecked(initial);
              setComments([]);
              setSubmitted(false);
              setMessage("");
              setError("");
            }}
          >
            <RotateCcw size={13} aria-hidden="true" />
            Reset this preview
          </button>
        )}
      </Panel>
    </>
  );
}
