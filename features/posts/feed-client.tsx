"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, ImagePlus, Send } from "lucide-react";
import { Avatar } from "@/components/ui";
import { currentUserId, getProfile, posts as initialPosts } from "@/lib/demo-data";
import type { FarmerPost, PostCategory } from "@/lib/types";
import { PostCard } from "./post-card";

export function FeedClient() {
  const currentUser = getProfile(currentUserId);
  const [posts, setPosts] = useState(initialPosts);
  const [body, setBody] = useState("");
  const [category, setCategory] = useState<PostCategory>("question");
  const [toast, setToast] = useState("");

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  function publishPost(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanBody = body.trim();
    if (!cleanBody) {
      setToast("Write something before sharing.");
      return;
    }

    const newPost: FarmerPost = {
      id: `demo-${Date.now()}`,
      authorId: currentUserId,
      body: cleanBody,
      category,
      crops: [currentUser.crops[0]],
      createdLabel: "Just now",
      helpfulCount: 0,
      commentCount: 0,
    };
    setPosts((current) => [newPost, ...current]);
    setBody("");
    setToast("Your update is now at the top of the feed.");
  }

  function toggleHelpful(id: string) {
    setPosts((current) =>
      current.map((post) =>
        post.id === id
          ? {
              ...post,
              helpfulByViewer: !post.helpfulByViewer,
              helpfulCount:
                post.helpfulCount + (post.helpfulByViewer ? -1 : 1),
            }
          : post,
      ),
    );
  }

  return (
    <>
      <form className="card composer-card" onSubmit={publishPost}>
        <div className="composer-main">
          <Avatar initials={currentUser.initials} />
          <div className="field" style={{ flex: 1 }}>
            <label className="sr-only" htmlFor="new-post">
              What are you learning on the farm?
            </label>
            <textarea
              className="textarea"
              id="new-post"
              maxLength={2000}
              onChange={(event) => setBody(event.target.value)}
              placeholder="What are you learning on the farm?"
              value={body}
            />
          </div>
        </div>
        <div className="composer-actions">
          <div className="composer-options">
            <label className="sr-only" htmlFor="post-category">
              Post category
            </label>
            <select
              className="select"
              id="post-category"
              value={category}
              onChange={(event) =>
                setCategory(event.target.value as PostCategory)
              }
              style={{ width: "auto", minHeight: 42 }}
            >
              <option value="question">Question</option>
              <option value="discussion">Discussion</option>
              <option value="opportunity">Opportunity</option>
            </select>
            <button className="button button--ghost button--small" type="button">
              <ImagePlus size={17} aria-hidden="true" />
              Add image
            </button>
          </div>
          <button className="button" type="submit">
            <Send size={17} aria-hidden="true" />
            Share update
          </button>
        </div>
      </form>

      {posts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          onToggleHelpful={toggleHelpful}
        />
      ))}

      {toast ? (
        <div className="toast" role="status">
          <CheckCircle2 size={19} aria-hidden="true" />
          {toast}
        </div>
      ) : null}
    </>
  );
}
