export default function Loading() {
  return (
    <div className="preview-loading" role="status">
      <div className="loading-line" />
      <div className="loading-cards">
        {[1, 2, 3, 4].map((key) => (
          <div key={key} />
        ))}
      </div>
      <p>Opening sample workspace…</p>
    </div>
  );
}
