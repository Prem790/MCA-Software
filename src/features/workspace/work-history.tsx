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
              <strong>
                {event.action.replaceAll(".", " ").replaceAll("_", " ")}
              </strong>
              {event.actorName ?? "System"}
              <time dateTime={event.occurredAt.toISOString()}>
                {new Intl.DateTimeFormat("en-IN", {
                  timeZone: "Asia/Kolkata",
                  dateStyle: "medium",
                  timeStyle: "short",
                }).format(event.occurredAt)}{" "}
                IST
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
