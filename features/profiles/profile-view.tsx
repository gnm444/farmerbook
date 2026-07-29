"use client";

import { useState, useTransition } from "react";
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
import {
  removePostAction,
  toggleHelpfulAction,
  updatePostAction,
} from "@/features/posts/actions";
import { createReportAction } from "@/features/moderation/actions";
import { setBlockAction, setFollowAction } from "@/features/network/actions";

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
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function updateFollow() {
    const active = !following;
    setError("");
    startTransition(async () => {
      const result = await setFollowAction({
        profileId: profile.id,
        active,
      });
      if (!result.ok) {
        setError(result.message ?? "Follow could not be updated.");
        return;
      }
      setFollowing(active);
    });
  }

  function updateBlock() {
    const active = !blocked;
    setError("");
    startTransition(async () => {
      const result = await setBlockAction(profile.id, active);
      if (!result.ok) {
        setError(result.message ?? "Block could not be updated.");
        return;
      }
      setBlocked(active);
    });
  }

  function reportProfile() {
    setError("");
    startTransition(async () => {
      const result = await createReportAction({
        targetType: "profile",
        targetId: profile.id,
        reason: "unsafe",
        details: "Reported from the participant profile for moderator review.",
      });
      if (!result.ok) {
        setError(result.message ?? "Report could not be sent.");
        return;
      }
      setReported(true);
    });
  }

  function toggleHelpful(postId: string) {
    setError("");
    startTransition(async () => {
      const result = await toggleHelpfulAction(postId);
      if (!result.ok) {
        setError(result.message ?? "Helpful could not be updated.");
        return;
      }
      setPosts((current) =>
        current.map((item) =>
          item.id === postId
            ? {
                ...item,
                helpfulByViewer: !item.helpfulByViewer,
                helpfulCount:
                  item.helpfulCount + (item.helpfulByViewer ? -1 : 1),
              }
            : item,
        ),
      );
    });
  }

  async function updatePost(
    postId: string,
    body: string,
    category: FarmerPost["category"],
  ) {
    const result = await updatePostAction({ postId, body, category });
    if (!result.ok) {
      setError(result.message ?? "The post could not be updated.");
      return false;
    }
    setPosts((current) =>
      current.map((post) =>
        post.id === postId ? { ...post, body, category } : post,
      ),
    );
    return true;
  }

  async function removePost(postId: string) {
    const result = await removePostAction(postId);
    if (!result.ok) {
      setError(result.message ?? "The post could not be removed.");
      return false;
    }
    setPosts((current) => current.filter((post) => post.id !== postId));
    return true;
  }

  return (
    <>
      <section className="card profile-hero">
        <div className="profile-cover" />
        <div className="profile-main">
          <div className="profile-identity">
            <Avatar
              initials={profile.initials}
              imageUrl={profile.avatarUrl}
              size="large"
            />
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
                  disabled={isPending}
                  aria-pressed={following}
                  onClick={updateFollow}
                >
                  {following ? "Following" : "Follow"}
                </button>
                <Link className="button button--secondary" href={`/messages?with=${profile.id}`}>
                  <MessageCircle size={17} aria-hidden="true" /> Message
                </Link>
                <button
                  className="icon-button"
                  type="button"
                  disabled={isPending}
                  aria-label={blocked ? "Unblock participant" : "Block participant"}
                  aria-pressed={blocked}
                  onClick={updateBlock}
                >
                  <Ban size={19} aria-hidden="true" />
                </button>
                <button
                  className="icon-button"
                  type="button"
                  disabled={isPending}
                  aria-label={reported ? "Participant reported" : "Report participant"}
                  aria-pressed={reported}
                  onClick={reportProfile}
                >
                  <Flag size={19} aria-hidden="true" />
                </button>
              </>
            )}
          </div>
        </div>
        {error ? <p className="form-error">{error}</p> : null}
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
                  canManage={isOwnProfile}
                  onToggleHelpful={toggleHelpful}
                  onUpdatePost={updatePost}
                  onRemovePost={removePost}
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
