import Link from "next/link";
import { Brand } from "@/components/ui";

export function PublicHeader() {
  return (
    <header className="public-header">
      <nav className="container public-nav" aria-label="Public navigation">
        <Link href="/" className="brand" aria-label="FarmerBook home">
          <Brand />
        </Link>
        <div className="public-links">
          <Link href="/#why">Why FarmerBook</Link>
          <Link href="/#how">How it works</Link>
          <Link href="/community-rules">Community rules</Link>
        </div>
        <div className="public-actions">
          <Link className="button button--ghost" href="/login">
            Sign in
          </Link>
          <Link className="button" href="/signup">
            Join the pilot
          </Link>
        </div>
      </nav>
    </header>
  );
}
