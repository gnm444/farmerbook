"use client";

import { useState, useTransition } from "react";
import { Avatar, VerifiedBadge } from "@/components/ui";
import {
  useAuthenticatedMessages,
  useLocale,
  useTranslations,
} from "@/components/locale-provider";
import { formatList } from "@/lib/i18n/format";
import type { FarmerProfile } from "@/lib/types";
import { setFollowAction } from "./actions";
import { localizedAccountRole } from "./localized-profile";

type NetworkTab = "following" | "followers";

export function NetworkClient({
  initialFollowing,
  followers,
}: {
  initialFollowing: FarmerProfile[];
  followers: FarmerProfile[];
}) {
  const { network } = useAuthenticatedMessages();
  const locale = useLocale();
  const common = useTranslations("common");
  const [tab, setTab] = useState<NetworkTab>("following");
  const [following, setFollowing] = useState(
    () => new Set(initialFollowing.map((profile) => profile.id)),
  );
  const [error, setError] = useState("");
  const [pendingId, setPendingId] = useState("");
  const [, startTransition] = useTransition();
  const directory = new Map(
    [...initialFollowing, ...followers].map((profile) => [profile.id, profile]),
  );

  const people =
    tab === "following"
      ? [...directory.values()].filter((profile) => following.has(profile.id))
      : followers;

  function toggleFollow(profileId: string) {
    const active = !following.has(profileId);
    setError("");
    setPendingId(profileId);
    startTransition(async () => {
      const result = await setFollowAction({ profileId, active });
      setPendingId("");
      if (!result.ok) {
        setError(network.updateError);
        return;
      }
      setFollowing((current) => {
        const next = new Set(current);
        if (active) next.add(profileId);
        else next.delete(profileId);
        return next;
      });
    });
  }

  return (
    <>
      <div className="tabs" role="tablist" aria-label={network.lists}>
        <button
          className="tab"
          role="tab"
          type="button"
          aria-selected={tab === "following"}
          onClick={() => setTab("following")}
        >
          {network.following} ({following.size})
        </button>
        <button
          className="tab"
          role="tab"
          type="button"
          aria-selected={tab === "followers"}
          onClick={() => setTab("followers")}
        >
          {network.followers} ({followers.length})
        </button>
      </div>
      {error ? <p className="form-error">{error}</p> : null}
      <section className="card list-card" aria-live="polite">
        {people.map((profile) => (
          <div className="list-row" key={profile.id}>
            <Avatar
              initials={profile.initials}
              imageUrl={profile.avatarUrl}
              role={profile.accountRole}
            />
            <div className="list-row__copy">
              <strong>
                {profile.fullName}{" "}
                {profile.verified ? <VerifiedBadge /> : null}
              </strong>
              <span>
                {localizedAccountRole(profile.accountRole, network)} · {profile.district},{" "}
                {profile.state} · {formatList(profile.crops, locale)}
              </span>
            </div>
            <button
              className={`button button--small ${
                following.has(profile.id) ? "button--secondary" : ""
              }`}
              type="button"
              disabled={pendingId === profile.id}
              aria-pressed={following.has(profile.id)}
              onClick={() => toggleFollow(profile.id)}
            >
              {pendingId === profile.id
                ? common("saving")
                : following.has(profile.id)
                  ? network.following
                  : network.follow}
            </button>
          </div>
        ))}
      </section>
    </>
  );
}
