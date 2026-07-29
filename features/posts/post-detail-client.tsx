"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import { Avatar } from "@/components/ui";
import {
  comments as initialComments,
  currentUserId,
  getProfile,
} from "@/lib/demo-data";
import type { Comment, FarmerPost } from "@/lib/types";
import { PostCard } from "./post-card";

export function PostDetailClient({ initialPost }: { initialPost: FarmerPost }) {
  const [post, setPost] = useState(initialPost);
  const [comments, setComments] = useState(
    initialComments.filter((comment) => comment.postId === initialPost.id),
  );
  const [body, setBody] = useState("");
  const currentUser = getProfile(currentUserId);

  function addComment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanBody = body.trim();
    if (!cleanBody) return;
    const newComment: Comment = {
      id: `comment-${Date.now()}`,
      postId: post.id,
      authorId: currentUserId,
      body: cleanBody,
      createdLabel: "Just now",
    };
    setComments((current) => [...current, newComment]);
    setPost((current) => ({
      ...current,
      commentCount: current.commentCount + 1,
    }));
    setBody("");
  }

  return (
    <>
      <PostCard
        post={post}
        onToggleHelpful={() =>
          setPost((current) => ({
            ...current,
            helpfulByViewer: !current.helpfulByViewer,
            helpfulCount:
              current.helpfulCount + (current.helpfulByViewer ? -1 : 1),
          }))
        }
      />
      <section className="card settings-card" aria-labelledby="comments-title">
        <h2 id="comments-title">Community answers</h2>
        <p>
          Add practical context and explain the limits of your own experience.
        </p>
        <form className="composer-main" onSubmit={addComment}>
          <Avatar initials={currentUser.initials} size="small" />
          <div className="field" style={{ flex: 1 }}>
            <label className="sr-only" htmlFor="comment-body">
              Add a comment
            </label>
            <textarea
              className="textarea"
              id="comment-body"
              maxLength={500}
              onChange={(event) => setBody(event.target.value)}
              placeholder="Share a helpful answer or ask for more detail…"
              value={body}
              style={{ minHeight: 82 }}
            />
          </div>
          <button className="button" type="submit" aria-label="Post comment">
            <Send size={17} aria-hidden="true" />
          </button>
        </form>
        <div style={{ marginTop: 22 }}>
          {comments.map((comment) => {
            const author = getProfile(comment.authorId);
            return (
              <article className="list-row" key={comment.id}>
                <Avatar initials={author.initials} size="small" />
                <div className="list-row__copy">
                  <strong>{author.fullName}</strong>
                  <p style={{ margin: "5px 0 2px" }}>{comment.body}</p>
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
