"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";
import { useTranslations } from "@/components/locale-provider";
import { Avatar } from "@/components/ui";
import { getProfile } from "@/lib/demo-data";
import type { Comment, FarmerPost, FarmerProfile } from "@/lib/types";
import {
  createCommentAction,
  removePostAction,
  toggleHelpfulAction,
  updatePostAction,
} from "./actions";
import { PostCard } from "./post-card";

export function PostDetailClient({
  initialPost,
  initialComments,
  currentUser,
}: {
  initialPost: FarmerPost;
  initialComments: Comment[];
  currentUser: FarmerProfile;
}) {
  const t = useTranslations("feed");
  const [post, setPost] = useState(initialPost);
  const router = useRouter();
  const [comments, setComments] = useState(initialComments);
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function addComment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanBody = body.trim();
    if (!cleanBody) return;
    setError("");
    startTransition(async () => {
      const result = await createCommentAction({
        postId: post.id,
        body: cleanBody,
      });
      if (!result.ok) {
        setError(t("answerFailed"));
        return;
      }
      const newComment: Comment = {
        id: `comment-${Date.now()}`,
        postId: post.id,
        authorId: currentUser.id,
        author: currentUser,
        body: cleanBody,
        createdLabel: t("justNow"),
      };
      setComments((current) => [...current, newComment]);
      setPost((current) => ({
        ...current,
        commentCount: current.commentCount + 1,
      }));
      setBody("");
    });
  }

  function toggleHelpful() {
    startTransition(async () => {
      const result = await toggleHelpfulAction(post.id);
      if (!result.ok) {
        setError(t("helpfulFailed"));
        return;
      }
      setPost((current) => ({
        ...current,
        helpfulByViewer: !current.helpfulByViewer,
        helpfulCount:
          current.helpfulCount + (current.helpfulByViewer ? -1 : 1),
      }));
    });
  }

  async function updatePost(
    postId: string,
    nextBody: string,
    nextCategory: FarmerPost["category"],
  ) {
    const result = await updatePostAction({
      postId,
      body: nextBody,
      category: nextCategory,
    });
    if (!result.ok) {
      setError(t("updateFailed"));
      return false;
    }
    setPost((current) => ({
      ...current,
      body: nextBody,
      category: nextCategory,
    }));
    return true;
  }

  async function removePost(postId: string) {
    const result = await removePostAction(postId);
    if (!result.ok) {
      setError(t("removeFailed"));
      return false;
    }
    router.push("/feed");
    router.refresh();
    return true;
  }

  return (
    <>
      <PostCard
        post={post}
        canManage={post.authorId === currentUser.id}
        onToggleHelpful={toggleHelpful}
        onUpdatePost={updatePost}
        onRemovePost={removePost}
      />
      <section className="card settings-card" aria-labelledby="comments-title">
        <h2 id="comments-title">{t("answers")}</h2>
        <p>{t("answersHelp")}</p>
        <form className="composer-main" onSubmit={addComment}>
          <Avatar
            initials={currentUser.initials}
            imageUrl={currentUser.avatarUrl}
            role={currentUser.accountRole}
            size="small"
          />
          <div className="field" style={{ flex: 1 }}>
            <label className="sr-only" htmlFor="comment-body">
              {t("addComment")}
            </label>
            <textarea
              className="textarea"
              id="comment-body"
              maxLength={500}
              onChange={(event) => setBody(event.target.value)}
              placeholder={t("commentPlaceholder")}
              dir="auto"
              value={body}
              style={{ minHeight: 82 }}
            />
          </div>
          <button
            className="button"
            type="submit"
            aria-label={t("postComment")}
            disabled={isPending}
          >
            <Send size={17} aria-hidden="true" />
          </button>
        </form>
        {error ? <p className="form-error">{error}</p> : null}
        <div style={{ marginTop: 22 }}>
          {comments.map((comment) => {
            const author = comment.author ?? getProfile(comment.authorId);
            return (
              <article className="list-row" key={comment.id}>
                <Avatar
                  initials={author.initials}
                  imageUrl={author.avatarUrl}
                  role={author.accountRole}
                  size="small"
                />
                <div className="list-row__copy">
                  <strong>{author.fullName}</strong>
                  <p style={{ margin: "5px 0 2px" }} dir="auto">{comment.body}</p>
                  <span>{comment.createdLabel}</span>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </>
  );
}
