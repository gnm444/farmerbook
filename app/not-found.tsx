import Link from "next/link";
import { SearchX } from "lucide-react";

export default function NotFound() {
  return (
    <main className="container" style={{ padding: "100px 0" }}>
      <section className="card empty-state">
        <div>
          <div className="empty-state__icon">
            <SearchX size={28} aria-hidden="true" />
          </div>
          <h1>We could not find that page</h1>
          <p>
            The profile or discussion may have been removed, hidden by a block,
            or the address may be incorrect.
          </p>
          <Link className="button" href="/feed">
            Return to the feed
          </Link>
        </div>
      </section>
    </main>
  );
}
