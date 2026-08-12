import { requireUser } from "@/features/auth/require-user";
import { loadProfilesByIds } from "@/features/profiles/queries";
import {
  comments as demoComments,
  getPost,
  getProfile,
  posts as demoPosts,
} from "@/lib/demo-data";
import { createdLabel } from "@/lib/data-mappers";
import { isDemoMode, isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import type {
  Comment,
  FarmerPost,
  FarmerProfile,
  PostCategory,
} from "@/lib/types";

type PostRow = {
  id: string;
  author_id: string;
  body: string;
  category: PostCategory;
  image_path: string | null;
  created_at: string;
};

type CommentRow = {
  id: string;
  post_id: string;
  author_id: string;
  body: string;
  created_at: string;
};

function demoPostWithAuthor(post: FarmerPost): FarmerPost {
  return { ...post, author: getProfile(post.authorId) };
}

async function hydratePosts(
  rows: PostRow[],
  viewerId: string,
): Promise<FarmerPost[]> {
  if (!rows.length) return [];

  const supabase = await createClient();
  const postIds = rows.map((row) => row.id);
  const profiles = await loadProfilesByIds([
    ...new Set(rows.map((row) => row.author_id)),
  ]);
  const [{ data: reactions, error: reactionError }, { data: comments, error: commentError }] =
    await Promise.all([
      supabase
        .from("post_reactions")
        .select("post_id, user_id")
        .in("post_id", postIds),
      supabase.from("comments").select("post_id").in("post_id", postIds),
    ]);

  if (reactionError || commentError) {
    throw new Error(reactionError?.message ?? commentError?.message);
  }

  const profilesById = new Map(
    profiles.map((profile) => [profile.id, profile]),
  );
  const helpfulCount = new Map<string, number>();
  const commentCount = new Map<string, number>();
  const helpfulByViewer = new Set<string>();

  for (const reaction of reactions ?? []) {
    const postId = reaction.post_id as string;
    helpfulCount.set(postId, (helpfulCount.get(postId) ?? 0) + 1);
    if (reaction.user_id === viewerId) helpfulByViewer.add(postId);
  }
  for (const comment of comments ?? []) {
    const postId = comment.post_id as string;
    commentCount.set(postId, (commentCount.get(postId) ?? 0) + 1);
  }
  const imageUrls = new Map<string, string>();
  await Promise.all(
    rows
      .filter((row) => row.image_path)
      .map(async (row) => {
        const { data } = await supabase.storage
          .from("post-images")
          .createSignedUrl(row.image_path as string, 60 * 60);
        if (data?.signedUrl) imageUrls.set(row.id, data.signedUrl);
      }),
  );

  return rows.map((row) => {
    const author = profilesById.get(row.author_id);
    return {
      id: row.id,
      authorId: row.author_id,
      author,
      body: row.body,
      category: row.category,
      crops: author?.crops ?? [],
      createdLabel: createdLabel(row.created_at),
      helpfulCount: helpfulCount.get(row.id) ?? 0,
      commentCount: commentCount.get(row.id) ?? 0,
      helpfulByViewer: helpfulByViewer.has(row.id),
      imageUrl: imageUrls.get(row.id),
    };
  });
}

export async function loadFeedPosts(): Promise<FarmerPost[]> {
  if (!isSupabaseConfigured()) {
    return isDemoMode() ? demoPosts.map(demoPostWithAuthor) : [];
  }

  const user = await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("posts")
    .select("id, author_id, body, category, image_path, created_at")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) throw new Error(error.message);
  return hydratePosts(data as PostRow[], user.id);
}

export async function loadPostsByAuthor(
  authorId: string,
): Promise<FarmerPost[]> {
  if (!isSupabaseConfigured()) {
    if (!isDemoMode()) return [];
    return demoPosts
      .filter((post) => post.authorId === authorId)
      .map(demoPostWithAuthor);
  }

  const user = await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("posts")
    .select("id, author_id, body, category, image_path, created_at")
    .eq("author_id", authorId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) throw new Error(error.message);
  return hydratePosts(data as PostRow[], user.id);
}

export async function loadPostBundle(postId: string): Promise<{
  post: FarmerPost;
  comments: Comment[];
} | null> {
  if (!isSupabaseConfigured()) {
    if (!isDemoMode()) return null;
    const post = getPost(postId);
    return {
      post: demoPostWithAuthor(post),
      comments: demoComments
        .filter((comment) => comment.postId === post.id)
        .map((comment) => ({
          ...comment,
          author: getProfile(comment.authorId),
        })),
    };
  }

  const user = await requireUser();
  const supabase = await createClient();
  const [{ data: postRow, error: postError }, { data: commentRows, error: commentError }] =
    await Promise.all([
      supabase
        .from("posts")
        .select("id, author_id, body, category, image_path, created_at")
        .eq("id", postId)
        .eq("status", "active")
        .maybeSingle(),
      supabase
        .from("comments")
        .select("id, post_id, author_id, body, created_at")
        .eq("post_id", postId)
        .eq("status", "active")
        .order("created_at", { ascending: true }),
    ]);

  if (postError || commentError) {
    throw new Error(postError?.message ?? commentError?.message);
  }
  if (!postRow) return null;

  const typedComments = (commentRows ?? []) as CommentRow[];
  const profiles = await loadProfilesByIds([
    postRow.author_id,
    ...typedComments.map((comment) => comment.author_id),
  ]);
  const byId = new Map(profiles.map((profile) => [profile.id, profile]));
  const [post] = await hydratePosts([postRow as PostRow], user.id);

  return {
    post,
    comments: typedComments.map((comment) => ({
      id: comment.id,
      postId: comment.post_id,
      authorId: comment.author_id,
      author: byId.get(comment.author_id),
      body: comment.body,
      createdLabel: createdLabel(comment.created_at),
    })),
  };
}

export function profileDirectoryFromPosts(posts: FarmerPost[]) {
  return posts
    .map((post) => post.author)
    .filter((profile): profile is FarmerProfile => Boolean(profile));
}
