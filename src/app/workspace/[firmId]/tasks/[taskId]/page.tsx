import { DataBadge, DateLabel } from "@/features/workspace/data-views";
import { EdgeState } from "@/features/workspace/edge-state";
import {
  displayTimestamp,
  displayLabel,
} from "@/features/workspace/data-display";
import Link from "next/link";
import { TaskReview } from "@/features/workspace/task-review";
import { DocumentUpload } from "@/features/workspace/document-upload";
import { DocumentList } from "@/features/workspace/document-list";
import { readStorageConfig } from "@/platform/storage/configuration";
import {
  pageActor,
  pageRecord,
  pageResourceId,
} from "@/platform/auth/page-session";
import { tasks, reviews, documents } from "@/platform/application/services";
import { getDatabase } from "@/platform/database/client";
import { listResourceAudit } from "@/modules/audit";
import { mayWorkOnTask, isEditableWork } from "@/modules/tasks";
import { commentQuery } from "@/modules/tasks/contracts";
import { TaskForm } from "@/features/workspace/task-form";
import { TaskWork, TaskCommentForm } from "@/features/workspace/task-work";
import { WorkHistory } from "@/features/workspace/work-history";
export default async function TaskPage({
  params,
  searchParams,
}: {
  params: Promise<{ firmId: string; taskId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { firmId, taskId } = await params;
  const actor = await pageActor(firmId);
  const parsed = commentQuery.safeParse(await searchParams);
  if (!parsed.success)
    return (
      <EdgeState
        title="Invalid comment page"
        action={
          <Link
            className="form-cancel"
            href={`/workspace/${firmId}/tasks/${taskId}`}
          >
            Return to task
          </Link>
        }
      >
        Check the comment page number or return to the latest task activity.
      </EdgeState>
    );
  const data = await pageRecord(() =>
    tasks().detail(actor, pageResourceId(taskId), parsed.data),
  );
  const record = data.task;
  const reviewPage = Number((await searchParams).reviewPage ?? 1);
  if (!Number.isInteger(reviewPage) || reviewPage < 1 || reviewPage > 10000)
    return (
      <EdgeState
        title="Invalid review page"
        action={
          <Link
            className="form-cancel"
            href={`/workspace/${firmId}/tasks/${taskId}`}
          >
            Return to task
          </Link>
        }
      >
        Check the review page number or return to the latest task activity.
      </EdgeState>
    );
  const detailPage = (changes: {
    reviewPage?: number;
    commentPage?: number;
  }) => {
    const pages = {
      reviewPage,
      commentPage: parsed.data.commentPage,
      ...changes,
    };
    return `?${new URLSearchParams({ reviewPage: String(pages.reviewPage), commentPage: String(pages.commentPage) })}`;
  };
  const history = await reviews().list(firmId, taskId, reviewPage);
  const latest = (
    reviewPage === 1 ? history : await reviews().list(firmId, taskId, 1)
  )[0];
  const reviewers = (await reviews().reviewers(firmId)).filter(
    (person) => person.id !== actor.userId,
  );
  const files = await documents().list(actor, {
    companyId: record.companyId,
    taskId,
  });
  const storageEnabled = readStorageConfig().enabled;
  const options =
    actor.role !== "staff" ? await tasks().options(actor) : undefined;
  const events = await listResourceAudit(getDatabase(), firmId, "task", taskId);
  const manager = actor.role !== "staff";
  const archived = !!record.companyArchivedAt;
  const worker = mayWorkOnTask(actor.role, actor.userId, record.assigneeId);
  const open = isEditableWork(record.status);
  return (
    <>
      <Link className="back-link" href={`/workspace/${firmId}/tasks`}>
        ← Tasks
      </Link>
      <div className="page-heading">
        <div>
          <p className="eyebrow">{record.companyName}</p>
          <h1>{record.title}</h1>
          <p className="page-description">
            Due <DateLabel value={record.dueDate} /> ·{" "}
            <DataBadge value={record.priority} /> ·{" "}
            {record.assigneeName ?? "Unassigned"}
            {record.assigneeRevokedAt ? " (access removed)" : ""}
          </p>
        </div>
      </div>
      <p className="task-stage">
        <DataBadge value={record.status} />
        <span>Prepare work → Independent review → Complete with evidence</span>
      </p>
      <nav className="record-jumps" aria-label="Task sections">
        <a href="#task-progress">Progress &amp; checklist</a>
        <a href="#task-documents">Documents</a>
        <a href="#task-review">Review &amp; approval</a>
        <a href="#task-comments">Comments</a>
      </nav>
      {archived && (
        <p className="workspace-readonly">
          The company is archived. Its work records are read-only.
        </p>
      )}
      <div className="workspace-actions work-record-links">
        <Link
          className="text-link"
          href={`/workspace/${firmId}/companies/${record.companyId}`}
        >
          Open company
        </Link>
        {record.obligationId && (
          <Link
            className="text-link"
            href={`/workspace/${firmId}/obligations/${record.obligationId}`}
          >
            {record.obligationTitle ?? "Open obligation"}
          </Link>
        )}
      </div>
      <div className="workspace-detail-grid">
        <section className="panel workspace-panel">
          <h2>Task details</h2>
          {options && !archived && open ? (
            <TaskForm
              key={record.version}
              firmId={firmId}
              options={options}
              task={record}
            />
          ) : (
            <p className="work-preserve">
              {record.description || "No instructions provided."}
            </p>
          )}
        </section>
        <WorkHistory events={events} />
      </div>
      <TaskWork
        key={record.version}
        firmId={firmId}
        task={record}
        checklist={data.checklist}
        canManage={manager}
        canWork={worker}
        archived={archived}
      />
      <section className="panel workspace-panel" id="task-documents">
        <h2>Private task documents</h2>
        <DocumentList firmId={firmId} items={files} />
        <Link
          className="text-link"
          href={`/workspace/${firmId}/documents?companyId=${record.companyId}&taskId=${taskId}`}
        >
          Browse all task documents
        </Link>
        {storageEnabled && worker && open && !archived && (
          <DocumentUpload
            key={record.version}
            firmId={firmId}
            companyId={record.companyId}
            taskId={taskId}
            version={record.version}
          />
        )}
        {!storageEnabled && (
          <p>
            Private storage is not configured yet. Review with a written
            evidence summary is still available.
          </p>
        )}
      </section>
      <section className="panel workspace-panel" id="task-review">
        <h2>Formal review and approval</h2>
        {latest?.outcome === "pending" && (
          <p>
            Awaiting reviewer: {latest.reviewerName}. An admin or manager may
            reopen to withdraw and reassign a review.
          </p>
        )}
        <TaskReview
          key={record.version}
          firmId={firmId}
          taskId={taskId}
          version={record.version}
          reviewers={reviewers}
          pendingId={latest?.id}
          submit={worker && open && !archived}
          decide={
            !archived &&
            manager &&
            record.status === "submitted_for_review" &&
            latest?.outcome === "pending" &&
            latest.reviewerId === actor.userId
          }
        />
        {history.map((review) => (
          <article className="review-history-card" key={review.id}>
            <h3>
              <DataBadge value={review.outcome} /> · submitted version{" "}
              {review.submittedVersion}
            </h3>
            <p>
              Submitted {displayTimestamp(review.submittedAt)} ·{" "}
              {review.submitterName} · reviewer {review.reviewerName}
            </p>
            <p className="work-preserve">
              <strong>Submission summary</strong>
              <br />
              {review.evidence}
            </p>
            {review.feedback && (
              <p className="work-preserve">
                <strong>Review feedback</strong>
                <br />
                {review.feedback}
              </p>
            )}
            <details>
              <summary>Submitted task and evidence snapshot</summary>
              <p>
                {review.snapshot.title} · due{" "}
                <DateLabel value={review.snapshot.dueDate} /> ·{" "}
                {displayLabel(review.snapshot.priority)} priority
              </p>
              <p>{review.snapshot.description}</p>
              <ul>
                {review.snapshot.checklist.map((item) => (
                  <li key={item.id}>
                    {item.checked ? "Checked" : "Unchecked"}: {item.title}
                  </li>
                ))}
              </ul>
              <ul>
                {review.snapshot.documents.map((file) => (
                  <li key={file.id}>
                    <a
                      className="text-link"
                      href={`/api/firms/${firmId}/documents/${file.id}/download`}
                    >
                      {file.name}
                    </a>
                    <span> · SHA-256: {file.sha256 ?? "unavailable"}</span>
                  </li>
                ))}
              </ul>
            </details>
            {review.decidedAt && (
              <p>
                Decision {displayTimestamp(review.decidedAt)} ·{" "}
                {review.deciderName}
              </p>
            )}
          </article>
        ))}
        {!history.length && <p>No submissions yet.</p>}
        <nav className="workspace-pagination" aria-label="Review pages">
          <span>Review page {reviewPage}</span>
          {reviewPage > 1 && (
            <Link
              href={`${detailPage({ reviewPage: reviewPage - 1 })}#task-review`}
            >
              Newer reviews
            </Link>
          )}
          {history.length === 10 && (
            <Link
              href={`${detailPage({ reviewPage: reviewPage + 1 })}#task-review`}
            >
              Older reviews
            </Link>
          )}
        </nav>
      </section>

      <section className="panel workspace-panel" id="task-comments">
        <h2>Comments · {data.commentTotal}</h2>
        {data.comments.length ? (
          <ul className="workspace-activity">
            {data.comments.map((comment) => (
              <li key={comment.id}>
                <strong>{comment.authorName}</strong>
                <p className="work-preserve">{comment.body}</p>
                <time dateTime={comment.createdAt.toISOString()}>
                  {displayTimestamp(comment.createdAt)}
                </time>
              </li>
            ))}
          </ul>
        ) : (
          <p>No comments yet.</p>
        )}
        <nav className="workspace-pagination" aria-label="Comment pages">
          <span>Latest first · page {parsed.data.commentPage}</span>
          {parsed.data.commentPage > 1 && (
            <Link
              href={`${detailPage({ commentPage: parsed.data.commentPage - 1 })}#task-comments`}
            >
              Newer comments
            </Link>
          )}
          {parsed.data.commentPage * 20 < data.commentTotal && (
            <Link
              href={`${detailPage({ commentPage: parsed.data.commentPage + 1 })}#task-comments`}
            >
              Older comments
            </Link>
          )}
        </nav>
        {worker && open && !archived && (
          <TaskCommentForm firmId={firmId} taskId={record.id} />
        )}
      </section>
    </>
  );
}
