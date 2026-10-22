import Link from "next/link";
export default function NotFound() {
  return (
    <section className="panel workspace-panel">
      <h1>Workspace record not found</h1>
      <p>This record is unavailable in your firm.</p>
      <Link href="/workspace" className="text-link">
        Return to your firms
      </Link>
    </section>
  );
}
