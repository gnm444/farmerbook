"use client";

import Link from "next/link";
import { MapPin, MessageCircle } from "lucide-react";
import { Avatar, VerifiedBadge } from "@/components/ui";
import type { FarmerProfile } from "@/lib/types";

export function ProfileCard({
  profile,
  following,
  pending = false,
  onToggleFollow,
}: {
  profile: FarmerProfile;
  following: boolean;
  pending?: boolean;
  onToggleFollow: (profileId: string) => void;
}) {
  return (
    <article className="card profile-card">
      <div className="profile-card__top">
        <Avatar initials={profile.initials} imageUrl={profile.avatarUrl} role={profile.accountRole} />
        <span className="badge badge--green">{profile.roleLabel}</span>
      </div>
      <h2>
        <Link
          href={`/farmers/${profile.handle}`}
          style={{ textDecoration: "none" }}
        >
          {profile.fullName}
        </Link>{" "}
        {profile.verified ? <VerifiedBadge /> : null}
      </h2>
      <div className="profile-card__role">
        <MapPin size={13} aria-hidden="true" /> {profile.district},{" "}
        {profile.state}
      </div>
      <p className="profile-card__bio">{profile.bio}</p>
      <div className="profile-card__crops">
        {profile.crops.slice(0, 3).map((crop) => (
          <span className="badge" key={crop}>
            {crop}
          </span>
        ))}
      </div>
      <div className="profile-card__actions">
        <button
          className={`button ${
            following ? "button--secondary" : ""
          } button--small`}
          type="button"
          disabled={pending}
          aria-pressed={following}
          onClick={() => onToggleFollow(profile.id)}
        >
          {pending ? "Saving…" : following ? "Following" : "Follow"}
        </button>
        <Link
          className="button button--ghost button--small"
          href={`/messages?with=${profile.id}`}
        >
          <MessageCircle size={15} aria-hidden="true" />
          Message
        </Link>
      </div>
    </article>
  );
}
