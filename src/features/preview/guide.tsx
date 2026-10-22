import Link from "next/link";
import { ArrowUpRight, CircleCheck, CircleDashed, Compass } from "lucide-react";
import { PageHeading, Panel } from "./components";

export function PreviewGuide() {
  return (
    <>
      <PageHeading
        eyebrow="TAKE A LOOK AROUND"
        title="Your guide to the preview"
        description="Explore the experience before the working MVP is connected."
      />
      <div className="guide-intro">
        <Compass size={30} strokeWidth={1.5} aria-hidden="true" />
        <div>
          <h2>A sample workspace, with a real sense of the flow.</h2>
          <p>
            All companies, people, comments, documents, and dates are fictional.
            The snapshot is fixed at 22 October 2026. No account is required.
          </p>
        </div>
      </div>
      <div className="detail-grid">
        <Panel title="What you can explore">
          <ul className="guide-list">
            {[
              "Navigate the dashboard and linked company records.",
              "Search and filter companies, assignments, and documents.",
              "Move between calendar months and open dated work.",
              "Check off sample preparation items and add a page-local comment.",
              "Download fictional text samples.",
              "Try settings controls and view sample team roles.",
            ].map((text) => (
              <li key={text}>
                <CircleCheck size={17} aria-hidden="true" />
                {text}
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title="What arrives with the working MVP">
          <ul className="guide-list pending-list">
            {[
              "Real sign-in, invitations, and role-based access.",
              "Saved company, obligation, and assignment records.",
              "Private file uploads and authorized downloads.",
              "Saved approvals, completion evidence, and activity.",
              "Delivered reminders and email notifications.",
            ].map((text) => (
              <li key={text}>
                <CircleDashed size={17} aria-hidden="true" />
                {text}
              </li>
            ))}
          </ul>
        </Panel>
      </div>
      <Panel
        title="Sample notifications"
        description="A preview of the updates your team could receive."
      >
        <div id="notifications" className="guide-notifications">
          <div>
            <strong>A review is waiting</strong>
            <p>A team member has submitted an assignment for review.</p>
            <Link
              href="/preview/tasks?status=submitted_for_review"
              className="text-link"
            >
              View sample review queue
              <ArrowUpRight size={14} />
            </Link>
          </div>
          <div>
            <strong>A deadline needs attention</strong>
            <p>An open sample assignment is past its illustrative due date.</p>
            <Link href="/preview/tasks?status=overdue" className="text-link">
              View sample overdue work
              <ArrowUpRight size={14} />
            </Link>
          </div>
        </div>
        <div className="panel-foot">
          Nothing in this preview sends email, submits a filing, or calculates a
          verified legal deadline.
        </div>
      </Panel>
    </>
  );
}
