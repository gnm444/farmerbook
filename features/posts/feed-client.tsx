"use client";

import { useEffect, useState, useTransition } from "react";
import { CheckCircle2, ImagePlus, Send } from "lucide-react";
import { Avatar } from "@/components/ui";
import type { FarmerPost, FarmerProfile, PostCategory } from "@/lib/types";
import {
  createPostAction,
  removePostAction,
  toggleHelpfulAction,
  updatePostAction,
} from "./actions";
import { PostCard } from "./post-card";
import { removePostImage, uploadPostImage } from "./uploads";
import { useTranslations } from "@/components/locale-provider";

export function FeedClient({
  currentUser,
  demoMode = false,
  initialPosts,
}: {
  currentUser: FarmerProfile;
  demoMode?: boolean;
  initialPosts: FarmerPost[];
}) {
  const t = useTranslations("feed");
  const common = useTranslations("common");
  const [posts, setPosts] = useState(initialPosts);
  const [body, setBody] = useState("");
  const [category, setCategory] = useState<PostCategory>("question");
  const [toast, setToast] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  function publishPost(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanBody = body.trim();
    if (!cleanBody) {
      setToast(t("writeBeforeShare"));
      return;
    }

    if (demoMode) {
      const newPost: FarmerPost = {
        id: `demo-new-post-${Date.now()}`,
        authorId: currentUser.id,
        author: currentUser,
        body: cleanBody,
        category,
        crops: currentUser.crops.slice(0, 1),
        createdLabel: t("justNow"),
        helpfulCount: 0,
        commentCount: 0,
      };
      setPosts((current) => [newPost, ...current]);
      setBody("");
      setImageFile(null);
      setToast(t("updateShared"));
      return;
    }

    startTransition(async () => {
      let imagePath: string | undefined;
      let imageUrl: string | undefined;
      if (imageFile) {
        try {
          const upload = await uploadPostImage(imageFile);
          imagePath = upload.path;
          imageUrl = upload.url;
        } catch {
          setToast(t("uploadFailed"));
          return;
        }
      }

      const result = await createPostAction({
        body: cleanBody,
        category,
        imagePath,
      });
      if (!result.ok) {
        if (imagePath) await removePostImage(imagePath);
        setToast(t("shareFailed"));
        return;
      }

      const newPost: FarmerPost = {
        id: result.postId,
        authorId: currentUser.id,
        author: currentUser,
        body: cleanBody,
        category,
        crops: currentUser.crops.slice(0, 1),
        createdLabel: t("justNow"),
        helpfulCount: 0,
        commentCount: 0,
        imageUrl,
      };
      setPosts((current) => [newPost, ...current]);
      setBody("");
      setImageFile(null);
      setToast(t("updateShared"));
    });
  }

  function toggleHelpful(id: string) {
    startTransition(async () => {
      const result = await toggleHelpfulAction(id);
      if (!result.ok) {
        setToast(t("helpfulFailed"));
        return;
      }
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
    });
  }

  async function updatePost(
    id: string,
    nextBody: string,
    nextCategory: PostCategory,
  ) {
    const result = await updatePostAction({
      postId: id,
      body: nextBody,
      category: nextCategory,
    });
    if (!result.ok) {
      setToast(t("updateFailed"));
      return false;
    }
    setPosts((current) =>
      current.map((post) =>
        post.id === id
          ? { ...post, body: nextBody, category: nextCategory }
          : post,
      ),
    );
    setToast(t("postUpdated"));
    return true;
  }

  async function removePost(id: string) {
    const result = await removePostAction(id);
    if (!result.ok) {
      setToast(t("removeFailed"));
      return false;
    }
    setPosts((current) => current.filter((post) => post.id !== id));
    setToast(t("postRemoved"));
    return true;
  }

  return (
    <>
      <form className="card composer-card" onSubmit={publishPost}>
        <div className="composer-main">
          <Avatar
            initials={currentUser.initials}
            imageUrl={currentUser.avatarUrl}
            role={currentUser.accountRole}
          />
          <div className="field" style={{ flex: 1 }}>
            <label className="sr-only" htmlFor="new-post">
              {t("prompt")}
            </label>
            <textarea
              className="textarea"
              id="new-post"
              maxLength={2000}
              onChange={(event) => setBody(event.target.value)}
              placeholder={t("prompt")}
              value={body}
            />
          </div>
        </div>
        <div className="composer-actions">
          <div className="composer-options">
            <label className="sr-only" htmlFor="post-category">
              {t("category")}
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
              <option value="question">{t("question")}</option>
              <option value="discussion">{t("discussion")}</option>
              <option value="opportunity">{t("opportunity")}</option>
            </select>
            <label className="button button--ghost button--small">
              <ImagePlus size={17} aria-hidden="true" />
              {imageFile ? imageFile.name : t("addImage")}
              <input
                className="sr-only"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(event) =>
                  setImageFile(event.target.files?.[0] ?? null)
                }
              />
            </label>
          </div>
          <button className="button" type="submit" disabled={isPending}>
            <Send size={17} aria-hidden="true" />
            {isPending ? common("saving") : t("shareUpdate")}
          </button>
        </div>
      </form>

      {posts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          canManage={post.authorId === currentUser.id}
          onToggleHelpful={toggleHelpful}
          onUpdatePost={updatePost}
          onRemovePost={removePost}
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
