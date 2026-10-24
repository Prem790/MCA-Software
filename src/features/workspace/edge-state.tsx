import Link from "next/link";
import { CircleHelp, LoaderCircle } from "lucide-react";
import type { ReactNode } from "react";
export function EdgeState({
  title,
  children,
  action,
  loading = false,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
  loading?: boolean;
}) {
  return (
    <section
      className="panel workspace-panel edge-state"
      aria-busy={loading || undefined}
    >
      <span className="edge-state-icon" aria-hidden="true">
        {loading ? (
          <LoaderCircle className="ui-spinner" size={28} />
        ) : (
          <CircleHelp size={28} />
        )}
      </span>
      <h1>{title}</h1>
      <p>{children}</p>
      <div className="edge-state-actions">
        {action}
        {!loading && (
          <Link href="/workspace" className="form-cancel">
            Return to your firms
          </Link>
        )}
      </div>
    </section>
  );
}
