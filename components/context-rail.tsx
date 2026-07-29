import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Avatar, VerifiedBadge } from "@/components/ui";
import { getProfile } from "@/lib/demo-data";

export function ContextRail() {
  const suggestions = [getProfile("suresh"), getProfile("priya")];

  return (
    <aside className="context-rail" aria-label="Community context">
      <section className="card context-card">
        <h2>People to learn from</h2>
        {suggestions.map((profile) => (
          <div className="suggestion" key={profile.id}>
            <Avatar initials={profile.initials} size="small" />
            <div className="suggestion__copy">
              <strong>
                {profile.fullName}{" "}
                {profile.verified ? <VerifiedBadge /> : null}
              </strong>
              <span>
                {profile.roleLabel} · {profile.district}
              </span>
            </div>
            <Link
              className="button button--secondary button--small"
              href={`/farmers/${profile.handle}`}
            >
              View
            </Link>
          </div>
        ))}
      </section>
      <section className="card context-card">
        <h2>This week in your network</h2>
        <div className="network-stat">
          <strong>12</strong>
          <span>useful answers shared by nearby farmers</span>
        </div>
        <div className="network-stat">
          <strong>7</strong>
          <span>new people joined the Maharashtra pilot</span>
        </div>
        <Link className="button button--ghost button--small" href="/network">
          See your network <ArrowRight size={15} aria-hidden="true" />
        </Link>
      </section>
      <section className="card context-card">
        <span className="badge badge--amber">Pilot reminder</span>
        <h2 style={{ marginTop: 12 }}>Advice should include context</h2>
        <p className="muted" style={{ fontSize: ".8rem", marginBottom: 0 }}>
          Share what you observed and what conditions were present. High-impact
          decisions should be checked with a qualified local professional.
        </p>
      </section>
    </aside>
  );
}
