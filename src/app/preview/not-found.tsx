import Link from "next/link";
export default function NotFound() {
  return (
    <div className="empty-state">
      <h1>Sample record not found</h1>
      <p>
        This preview contains a fixed set of fictional companies and
        assignments.
      </p>
      <Link className="text-link" href="/preview">
        Back to overview
      </Link>
    </div>
  );
}
