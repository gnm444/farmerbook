"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Avatar, VerifiedBadge } from "@/components/ui";
import { getProfile } from "@/lib/demo-data";
import { isDemoMode } from "@/lib/env";
import { useTranslations } from "@/components/locale-provider";

export function ContextRail() {
  const t = useTranslations("navigation");
  const demo = isDemoMode();
  const suggestions = demo ? [getProfile("suresh"), getProfile("priya")] : [];

  return (
    <aside className="context-rail" aria-label={t("communityContext")}>
      <section className="card context-card">
        <h2>{t("peopleLearn")}</h2>
        {suggestions.length ? suggestions.map((profile) => (
          <div className="suggestion" key={profile.id}>
            <Avatar
              initials={profile.initials}
              imageUrl={profile.avatarUrl}
              role={profile.accountRole}
              size="small"
            />
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
              {t("view")}
            </Link>
          </div>
        )) : (
          <p className="muted">
            {t("suggestionEmpty")}
          </p>
        )}
      </section>
      <section className="card context-card">
        <h2>{t("weekNetwork")}</h2>
        {demo ? (
          <>
            <div className="network-stat">
              <strong>12</strong>
              <span>{t("answersShared")}</span>
            </div>
            <div className="network-stat">
              <strong>7</strong>
              <span>{t("peopleJoined")}</span>
            </div>
          </>
        ) : (
          <p className="muted">
            {t("networkEmpty")}
          </p>
        )}
        <Link className="button button--ghost button--small" href="/network">
          {t("seeNetwork")} <ArrowRight size={15} aria-hidden="true" />
        </Link>
      </section>
      <section className="card context-card">
        <span className="badge badge--amber">{t("pilotReminder")}</span>
        <h2 style={{ marginTop: 12 }}>{t("adviceContext")}</h2>
        <p className="muted" style={{ fontSize: ".8rem", marginBottom: 0 }}>
          {t("adviceBody")}
        </p>
      </section>
    </aside>
  );
}
