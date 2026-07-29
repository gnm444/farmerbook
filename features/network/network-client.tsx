"use client";

import { useState } from "react";
import { Avatar, VerifiedBadge } from "@/components/ui";
import { profiles } from "@/lib/demo-data";

type NetworkTab = "following" | "followers";

export function NetworkClient() {
  const [tab, setTab] = useState<NetworkTab>("following");
  const [following, setFollowing] = useState(
    () => new Set(["ramesh", "anjali", "vikram"]),
  );

  const people =
    tab === "following"
      ? profiles.filter((profile) => following.has(profile.id))
      : profiles.filter((profile) =>
          ["ramesh", "suresh", "priya", "vikram"].includes(profile.id),
        );

  return (
    <>
      <div className="tabs" role="tablist" aria-label="Network lists">
        <button
          className="tab"
          role="tab"
          type="button"
          aria-selected={tab === "following"}
          onClick={() => setTab("following")}
        >
          Following ({following.size})
        </button>
        <button
          className="tab"
          role="tab"
          type="button"
          aria-selected={tab === "followers"}
          onClick={() => setTab("followers")}
        >
          Followers (128)
        </button>
      </div>
      <section className="card list-card" aria-live="polite">
        {people.map((profile) => (
          <div className="list-row" key={profile.id}>
            <Avatar initials={profile.initials} />
            <div className="list-row__copy">
              <strong>
                {profile.fullName}{" "}
                {profile.verified ? <VerifiedBadge /> : null}
              </strong>
              <span>
                {profile.roleLabel} · {profile.district}, {profile.state} ·{" "}
                {profile.crops.join(", ")}
              </span>
            </div>
            <button
              className={`button button--small ${
                following.has(profile.id) ? "button--secondary" : ""
              }`}
              type="button"
              aria-pressed={following.has(profile.id)}
              onClick={() =>
                setFollowing((current) => {
                  const next = new Set(current);
                  if (next.has(profile.id)) next.delete(profile.id);
                  else next.add(profile.id);
                  return next;
                })
              }
            >
              {following.has(profile.id) ? "Following" : "Follow"}
            </button>
          </div>
        ))}
      </section>
    </>
  );
}
