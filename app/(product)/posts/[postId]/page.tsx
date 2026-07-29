import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { ContextRail } from "@/components/context-rail";
import { ProductHeader } from "@/components/product-header";
import { PostDetailClient } from "@/features/posts/post-detail-client";
import { loadPostBundle } from "@/features/posts/queries";
import { loadCurrentProfile } from "@/features/profiles/queries";

export const metadata: Metadata = { title: "Post discussion" };

export default async function PostDetailPage({
  params,
}: {
  params: Promise<{ postId: string }>;
}) {
  const { postId } = await params;
  const [bundle, currentUser] = await Promise.all([
    loadPostBundle(postId),
    loadCurrentProfile(),
  ]);
  if (!bundle) notFound();

  return (
    <div className="product-page">
      <ProductHeader
        eyebrow="Community discussion"
        title="Post and answers"
        description="Read the full context before adding your experience."
        action={
          <Link className="button button--secondary" href="/feed">
            <ArrowLeft size={17} aria-hidden="true" /> Back to feed
          </Link>
        }
      />
      <div className="feed-layout">
        <section className="feed-column">
          <PostDetailClient
            initialPost={bundle.post}
            initialComments={bundle.comments}
            currentUser={currentUser}
          />
        </section>
        <ContextRail />
      </div>
    </div>
  );
}
