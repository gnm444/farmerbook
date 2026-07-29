"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Ban,
  CalendarDays,
  Flag,
  MapPin,
  MessageCircle,
} from "lucide-react";
import { Avatar, VerifiedBadge } from "@/components/ui";
import type { FarmerPost, FarmerProfile } from "@/lib/types";
import { PostCard } from "@/features/posts/post-card";

export function ProfileView({
  profile,
  profilePosts,
  isOwnProfile,
}: {
  profile: FarmerProfile;
  profilePosts: FarmerPost[];
  isOwnProfile: boolean;
}) {
  const [following, setFollowing] = useState(Boolean(profile.isFollowing));
  const [blocked, setBlocked] = useState(false);
  const [reported, setReported] = useState(false);
  const [posts, setPosts] = useState(profilePosts);

  return (
    <>
      <section className="card profile-hero">
        <div className="profile-cover" />
        <div className="profile-main">
          <div className="profile-identity">
            <Avatar initials={profile.initials} size="large" />
            <h1>
              {profile.fullName}{" "}
              {profile.verified ? <VerifiedBadge label="Verified participant" /> : null}
            </h1>
            <div className="muted">
              {profile.roleLabel} · @{profile.handle}
            </div>
            <p className="profile-bio">{profile.bio}</p>
            <div className="profile-meta">
              <span>
                <MapPin size={15} aria-hidden="true" /> {profile.district},{" "}
                {profile.state}
              </span>
              <span>
                <CalendarDays size={15} aria-hidden="true" /> {profile.joinedLabel}
              </span>
              {profile.experienceYears ? (
                <span>{profile.experienceYears} years of experience</span>
              ) : null}
            </div>
            <div className="profile-card__crops" style={{ marginTop: 15 }}>
              {profile.crops.map((crop) => (
                <span className="badge badge--green" key={crop}>
                  {crop}
                </span>
              ))}
            </div>
            <div className="profile-stats">
              <div>
                <strong>{profile.followers}</strong>
                <span>Followers</span>
              </div>
              <div>
                <strong>{profile.following}</strong>
                <span>Following</span>
              </div>
              <div>
                <strong>{profilePosts.length}</strong>
                <span>Recent posts</span>
              </div>
            </div>
          </div>
          <div className="profile-actions">
            {isOwnProfile ? (
              <Link className="button" href="/settings/profile">
                Edit profile
              </Link>
            ) : (
              <>
                <button
                  className={`button ${following ? "button--secondary" : ""}`}
                  type="button"
                  aria-pressed={following}
                  onClick={() => setFollowing((current) => !current)}
                >
                  {following ? "Following" : "Follow"}
                </button>
                <Link className="button button--secondary" href={`/messages?with=${profile.id}`}>
                  <MessageCircle size={17} aria-hidden="true" /> Message
                </Link>
                <button
                  className="icon-button"
                  type="button"
                  aria-label={blocked ? "Unblock participant" : "Block participant"}
                  aria-pressed={blocked}
                  onClick={() => setBlocked((current) => !current)}
                >
                  <Ban size={19} aria-hidden="true" />
                </button>
                <button
                  className="icon-button"
                  type="button"
                  aria-label={reported ? "Participant reported" : "Report participant"}
                  aria-pressed={reported}
                  onClick={() => setReported(true)}
                >
                  <Flag size={19} aria-hidden="true" />
                </button>
              </>
            )}
          </div>
        </div>
      </section>
      {blocked ? (
        <section className="card empty-state">
          <div>
            <div className="empty-state__icon">
              <Ban size={27} aria-hidden="true" />
            </div>
            <h2>This participant is blocked</h2>
            <p>
              Their posts and messages are hidden from your normal FarmerBook
              views. You can unblock them from this profile.
            </p>
          </div>
        </section>
      ) : (
        <div className="feed-layout">
          <section className="feed-column" aria-label={`${profile.fullName} posts`}>
            <h2 style={{ fontSize: "1.1rem", margin: "0 0 14px" }}>
              Recent field updates
            </h2>
            {posts.length ? (
              posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  onToggleHelpful={(id) =>
                    setPosts((current) =>
                      current.map((item) =>
                        item.id === id
                          ? {
                              ...item,
                              helpfulByViewer: !item.helpfulByViewer,
                              helpfulCount:
                                item.helpfulCount +
                                (item.helpfulByViewer ? -1 : 1),
                            }
                          : item,
                      ),
                    )
                  }
                />
              ))
            ) : (
              <section className="card empty-state">
                <div>
                  <h2>No posts yet</h2>
                  <p>
                    Future field updates from this participant will appear here.
                  </p>
                </div>
              </section>
            )}
          </section>
        </div>
      )}
    </>
  );
}
