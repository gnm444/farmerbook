"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Flag,
  Heart,
  MessageCircle,
  Share2,
} from "lucide-react";
import { Avatar, VerifiedBadge } from "@/components/ui";
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
}: {
  post: FarmerPost;
  onToggleHelpful?: (id: string) => void;
}) {
  const author = getProfile(post.authorId);
  const [reported, setReported] = useState(false);

  return (
    <article className="card post-card">
      <div className="person-row">
        <Avatar initials={author.initials} />
        <div className="person-row__copy">
          <div className="person-name">
            <Link
              href={`/farmers/${author.handle}`}
              style={{ textDecoration: "none" }}
            >
              {author.fullName}
            </Link>
            {author.verified ? <VerifiedBadge /> : null}
          </div>
          <div className="person-meta">
            {author.roleLabel} · {author.district}, {author.state} ·{" "}
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
      <p className="post-body">{post.body}</p>
      {post.imageVariant ? (
        <div
          className={`post-image post-image--${post.imageVariant}`}
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
        <button className="post-action" type="button">
          <Share2 size={18} aria-hidden="true" />
          Share
        </button>
        <button
          className="post-action"
          type="button"
          aria-pressed={reported}
          onClick={() => setReported(true)}
        >
          <Flag size={18} aria-hidden="true" />
          {reported ? "Report sent" : "Report"}
        </button>
      </div>
    </article>
  );
}
