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
import { useLocale, useTranslations } from "@/components/locale-provider";
import { formatNumber } from "@/lib/i18n/format";

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
  const locale = useLocale();
  const t = useTranslations("feed");
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
      setReportError(t("reportFailed"));
      return;
    }
    setReported(true);
  }

  async function sharePost() {
    const url = `${window.location.origin}/posts/${post.id}`;
    if (navigator.share) {
      await navigator.share({
        title: t("shareTitle", { name: displayedAuthor.fullName }),
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
    if (!onRemovePost || !window.confirm(t("removeConfirm"))) {
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
          role={displayedAuthor.accountRole}
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
            {displayedAuthor.accountRole === "farmer"
              ? t("farmer")
              : displayedAuthor.accountRole === "customer"
                ? t("customer")
                : displayedAuthor.accountRole === "wholesaler"
                  ? t("wholesaler")
                  : t("inc")} · {displayedAuthor.district},{" "}
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
          {t(post.category)}
        </span>
      </div>
      {editing ? (
        <form className="form-stack" onSubmit={saveEdit}>
          <label className="field">
            <span className="field-label">{t("postText")}</span>
            <textarea
              className="textarea"
              value={draftBody}
              maxLength={2000}
              onChange={(event) => setDraftBody(event.target.value)}
            />
          </label>
          <label className="field">
            <span className="field-label">{t("category")}</span>
            <select
              className="select"
              value={draftCategory}
              onChange={(event) =>
                setDraftCategory(
                  event.target.value as FarmerPost["category"],
                )
              }
            >
              <option value="question">{t("question")}</option>
              <option value="discussion">{t("discussion")}</option>
              <option value="opportunity">{t("opportunity")}</option>
            </select>
          </label>
          <div className="report-actions">
            <button className="button button--small" disabled={managing}>
              {t("savePost")}
            </button>
            <button
              className="button button--secondary button--small"
              type="button"
              onClick={() => setEditing(false)}
            >
              {t("cancel")}
            </button>
          </div>
        </form>
      ) : (
        <p className="post-body" dir="auto">{post.body}</p>
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
          aria-label={t("farmImageAlt", { crop: post.crops[0] ?? t("farmFallback") })}
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
          {t("helpful", { count: formatNumber(post.helpfulCount, locale) })}
        </button>
        <Link className="post-action" href={`/posts/${post.id}`}>
          <MessageCircle size={18} aria-hidden="true" />
          {t("comments", { count: formatNumber(post.commentCount, locale) })}
        </Link>
        <button className="post-action" type="button" onClick={sharePost}>
          <Share2 size={18} aria-hidden="true" />
          {shared ? t("linkCopied") : t("share")}
        </button>
        <button
          className="post-action"
          type="button"
          aria-pressed={reported}
          onClick={reportPost}
        >
          <Flag size={18} aria-hidden="true" />
          {reported ? t("reportSent") : t("report")}
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
            <Pencil size={15} aria-hidden="true" /> {t("edit")}
          </button>
          <button
            className="button button--ghost button--small"
            type="button"
            disabled={managing}
            onClick={removePost}
          >
            <Trash2 size={15} aria-hidden="true" /> {t("remove")}
          </button>
        </div>
      ) : null}
      {reportError ? <p className="form-error">{reportError}</p> : null}
    </article>
  );
}
