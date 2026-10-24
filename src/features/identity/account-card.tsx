import Link from "next/link";
import { ShieldCheck } from "lucide-react";
export function AccountCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <main className="identity-page">
      <section className="identity-card">
        <Link href="/" className="brand">
          <span className="brand-symbol">
            <ShieldCheck size={22} aria-hidden="true" />
          </span>
          MCA Software
        </Link>
        <h1>{title}</h1>
        {children}
        <Link className="text-link" href="/login">
          Back to sign in
        </Link>
      </section>
    </main>
  );
}
