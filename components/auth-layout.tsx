import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { Brand } from "@/components/ui";

export function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="auth-page">
      <aside className="auth-aside">
        <Link href="/" className="brand" aria-label="FarmerBook home">
          <Brand inverse />
        </Link>
        <div className="auth-quote">
          <p className="eyebrow">A useful network starts with trust</p>
          <h1>Learn from people who understand the field.</h1>
          <p>
            Build a farming profile, find people working with similar crops and
            exchange practical experience in a moderated community.
          </p>
        </div>
        <div className="auth-proof">
          <ShieldCheck size={20} aria-hidden="true" />
          Controlled pilot · Profile visibility stays within the community
        </div>
      </aside>
      <section className="auth-main">{children}</section>
    </main>
  );
}
