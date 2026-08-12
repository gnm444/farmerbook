"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  Ban,
  CalendarDays,
  ExternalLink,
  Flag,
  MapPin,
  MessageCircle,
  PackageSearch,
  Store,
} from "lucide-react";
import { Avatar, VerifiedBadge } from "@/components/ui";
import { ListingImage } from "@/features/marketplace/listing-image";
import type {
  FarmerPost,
  FarmerProfile,
  MarketReview,
  ProduceListing,
} from "@/lib/types";
import { PostCard } from "@/features/posts/post-card";
import {
  removePostAction,
  toggleHelpfulAction,
  updatePostAction,
} from "@/features/posts/actions";
import { createReportAction } from "@/features/moderation/actions";
import { setBlockAction, setFollowAction } from "@/features/network/actions";
import { ReviewList } from "@/features/reviews/review-list";
import { ShareProfileButton } from "./share-profile-button";

export function ProfileView({
  profile,
  profilePosts,
  profileListings,
  reviews,
  isOwnProfile,
}: {
  profile: FarmerProfile;
  profilePosts: FarmerPost[];
  profileListings: ProduceListing[];
  reviews: MarketReview[];
  isOwnProfile: boolean;
}) {
  const [following, setFollowing] = useState(Boolean(profile.isFollowing));
  const [blocked, setBlocked] = useState(false);
  const [reported, setReported] = useState(false);
  const [posts, setPosts] = useState(profilePosts);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const isSeller =
    profile.accountRole === "farmer" || profile.accountRole === "wholesaler";

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
        <div
          className="profile-cover"
          style={profile.coverUrl ? { backgroundImage: `url("${profile.coverUrl}")` } : undefined}
        />
        <div className="profile-main">
          <div className="profile-identity">
            <Avatar
              initials={profile.initials}
              imageUrl={profile.avatarUrl}
              role={profile.accountRole}
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
              {profile.farmingMethod ? (
                <span className="badge badge--amber">
                  {profile.farmingMethod} farming
                </span>
              ) : null}
              {profile.crops.map((crop) => (
                <span className="badge badge--green" key={crop}>
                  {crop}
                </span>
              ))}
            </div>
            <div className="social-link-row">
              {Object.entries(profile.socialLinks).some(([, url]) => Boolean(url)) ? Object.entries(profile.socialLinks).map(([network, url]) =>
                url ? (
                  <a
                    href={url}
                    key={network}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink size={14} aria-hidden="true" />
                    {network}
                  </a>
                ) : null,
              ) : <span className="form-helper">No social links have been added yet.</span>}
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
              <>
                <Link className="button" href="/settings/profile">
                  Edit profile
                </Link>
                {profile.publicProfileEnabled ? (
                  <ShareProfileButton
                    handle={profile.handle}
                    fullName={profile.fullName}
                    label="Share public profile"
                  />
                ) : null}
              </>
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
        <>
          {isSeller ? (
          <section className="card profile-storefront">
            <div className="profile-storefront__head">
              <div>
                <p className="eyebrow">Seller storefront</p>
                <h2>Available from {isOwnProfile ? "you" : profile.fullName}</h2>
                <p>
                  Current harvest lots buyers can review and enquire about
                  directly.
                </p>
              </div>
              <Link
                className="button button--secondary"
                href={isOwnProfile ? "/business" : `/store/${profile.handle}`}
              >
                <Store size={17} aria-hidden="true" />
                {isOwnProfile ? "Manage storefront" : "View public storefront"}
              </Link>
            </div>
            {profileListings.length ? (
              <div className="profile-listing-strip">
                {profileListings.slice(0, 3).map((listing) => (
                  <Link key={listing.id} href={`/marketplace/${listing.id}`}>
                    <ListingImage
                      className="listing-photo profile-listing-strip__photo"
                      variant={listing.imageVariant}
                    />
                    <span>
                      <strong>{listing.title}</strong>
                      <small>
                        {listing.quantity} {listing.unit} · ₹{listing.price}/{listing.priceUnit}
                      </small>
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="profile-storefront__empty">
                <PackageSearch size={22} aria-hidden="true" />
                <span>
                  <strong>No active produce listings</strong>
                  <small>New harvest availability will appear here.</small>
                </span>
              </div>
            )}
          </section>
          ) : null}

          {isSeller ? <ReviewList reviews={reviews} /> : null}

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
        </>
      )}
    </>
  );
}
