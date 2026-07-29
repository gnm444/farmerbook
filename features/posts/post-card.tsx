"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Flag,
  Heart,
  MessageCircle,
  Pencil,
  Share2,
  Trash2,
} from "lucide-react";
import { Avatar, VerifiedBadge } from "@/components/ui";
import { createReportAction } from "@/features/moderation/actions";
import { getProfile } from "@/lib/demo-data";
import type { FarmerPost } from "@/lib/types";

const categoryLabel = {
  discussion: "Discussion",
  question: "Question",
  opportunity: "Opportunity",
} as const;

export function PostCard({
  post,
  onToggleHelpful,
  canManage = false,
  onUpdatePost,
  onRemovePost,
}: {
  post: FarmerPost;
  onToggleHelpful?: (id: string) => void;
  canManage?: boolean;
  onUpdatePost?: (
    id: string,
    body: string,
    category: FarmerPost["category"],
  ) => Promise<boolean>;
  onRemovePost?: (id: string) => Promise<boolean>;
}) {
  const author = getProfile(post.authorId);
  const [reported, setReported] = useState(false);
  const [shared, setShared] = useState(false);
  const [reportError, setReportError] = useState("");
  const [editing, setEditing] = useState(false);
  const [draftBody, setDraftBody] = useState(post.body);
  const [draftCategory, setDraftCategory] = useState(post.category);
  const [managing, setManaging] = useState(false);
  const displayedAuthor = post.author ?? author;

  async function reportPost() {
    setReportError("");
    const result = await createReportAction({
      targetType: "post",
      targetId: post.id,
      reason: "unsafe",
      details: "Reported from the post card for moderator review.",
    });
    if (!result.ok) {
      setReportError(result.message ?? "Report could not be sent.");
      return;
    }
    setReported(true);
  }

  async function sharePost() {
    const url = `${window.location.origin}/posts/${post.id}`;
    if (navigator.share) {
      await navigator.share({
        title: `${displayedAuthor.fullName} on FarmerBook`,
        text: post.body,
        url,
      });
    } else {
      await navigator.clipboard.writeText(url);
    }
    setShared(true);
  }

  async function saveEdit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!onUpdatePost || !draftBody.trim()) return;
    setManaging(true);
    const updated = await onUpdatePost(
      post.id,
      draftBody.trim(),
      draftCategory,
    );
    setManaging(false);
    if (updated) setEditing(false);
  }

  async function removePost() {
    if (!onRemovePost || !window.confirm("Remove this post from FarmerBook?")) {
      return;
    }
    setManaging(true);
    await onRemovePost(post.id);
    setManaging(false);
  }

  return (
    <article className="card post-card">
      <div className="person-row">
        <Avatar
          initials={displayedAuthor.initials}
          imageUrl={displayedAuthor.avatarUrl}
        />
        <div className="person-row__copy">
          <div className="person-name">
            <Link
              href={`/farmers/${displayedAuthor.handle}`}
              style={{ textDecoration: "none" }}
            >
              {displayedAuthor.fullName}
            </Link>
            {displayedAuthor.verified ? <VerifiedBadge /> : null}
          </div>
          <div className="person-meta">
            {displayedAuthor.roleLabel} · {displayedAuthor.district},{" "}
            {displayedAuthor.state} ·{" "}
            {post.createdLabel}
          </div>
        </div>
      </div>
      <div className="post-tags">
        {post.crops.map((crop) => (
          <span className="badge" key={crop}>
            {crop}
          </span>
        ))}
        <span
          className={`badge ${
            post.category === "question" ? "badge--amber" : "badge--green"
          }`}
        >
          {categoryLabel[post.category]}
        </span>
      </div>
      {editing ? (
        <form className="form-stack" onSubmit={saveEdit}>
          <label className="field">
            <span className="field-label">Post text</span>
            <textarea
              className="textarea"
              value={draftBody}
              maxLength={2000}
              onChange={(event) => setDraftBody(event.target.value)}
            />
          </label>
          <label className="field">
            <span className="field-label">Category</span>
            <select
              className="select"
              value={draftCategory}
              onChange={(event) =>
                setDraftCategory(
                  event.target.value as FarmerPost["category"],
                )
              }
            >
              <option value="question">Question</option>
              <option value="discussion">Discussion</option>
              <option value="opportunity">Opportunity</option>
            </select>
          </label>
          <div className="report-actions">
            <button className="button button--small" disabled={managing}>
              Save post
            </button>
            <button
              className="button button--secondary button--small"
              type="button"
              onClick={() => setEditing(false)}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <p className="post-body">{post.body}</p>
      )}
      {post.imageUrl || post.imageVariant ? (
        <div
          className={`post-image${
            post.imageVariant ? ` post-image--${post.imageVariant}` : ""
          }`}
          style={
            post.imageUrl
              ? {
                  backgroundImage: `url("${post.imageUrl}")`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }
              : undefined
          }
          role="img"
          aria-label={`${post.crops[0] ?? "Farm"} field update`}
        />
      ) : null}
      <div className="post-action-row">
        <button
          className="post-action"
          type="button"
          aria-pressed={post.helpfulByViewer}
          onClick={() => onToggleHelpful?.(post.id)}
        >
          <Heart
            size={18}
            fill={post.helpfulByViewer ? "currentColor" : "none"}
            aria-hidden="true"
          />
          {post.helpfulCount} Helpful
        </button>
        <Link className="post-action" href={`/posts/${post.id}`}>
          <MessageCircle size={18} aria-hidden="true" />
          {post.commentCount} comments
        </Link>
        <button className="post-action" type="button" onClick={sharePost}>
          <Share2 size={18} aria-hidden="true" />
          {shared ? "Link copied" : "Share"}
        </button>
        <button
          className="post-action"
          type="button"
          aria-pressed={reported}
          onClick={reportPost}
        >
          <Flag size={18} aria-hidden="true" />
          {reported ? "Report sent" : "Report"}
        </button>
      </div>
      {canManage ? (
        <div className="report-actions">
          <button
            className="button button--ghost button--small"
            type="button"
            disabled={managing}
            onClick={() => setEditing(true)}
          >
            <Pencil size={15} aria-hidden="true" /> Edit
          </button>
          <button
            className="button button--ghost button--small"
            type="button"
            disabled={managing}
            onClick={removePost}
          >
            <Trash2 size={15} aria-hidden="true" /> Remove
          </button>
        </div>
      ) : null}
      {reportError ? <p className="form-error">{reportError}</p> : null}
    </article>
  );
}
