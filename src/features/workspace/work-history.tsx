import { displayTimestamp, displayLabel } from "./data-display";
export function WorkHistory({
  events,
}: {
  events: {
    id: string;
    action: string;
    actorName: string | null;
    occurredAt: Date;
  }[];
}) {
  return (
    <section className="panel workspace-panel">
      <h2>Activity history</h2>
      <p className="workspace-note">Latest 50 events.</p>
      {events.length ? (
        <ul className="workspace-activity">
          {events.map((event) => (
            <li key={event.id}>
              <strong>{displayLabel(event.action.replaceAll(".", " "))}</strong>
              {event.actorName ?? "System"}
              <time dateTime={event.occurredAt.toISOString()}>
                {displayTimestamp(event.occurredAt)}
              </time>
            </li>
          ))}
        </ul>
      ) : (
        <p>No activity yet.</p>
      )}
    </section>
  );
}
