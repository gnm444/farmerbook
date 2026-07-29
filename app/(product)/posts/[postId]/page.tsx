import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ContextRail } from "@/components/context-rail";
import { ProductHeader } from "@/components/product-header";
import { getPost } from "@/lib/demo-data";
import { PostDetailClient } from "@/features/posts/post-detail-client";

export const metadata: Metadata = { title: "Post discussion" };

export default async function PostDetailPage({
  params,
}: {
  params: Promise<{ postId: string }>;
}) {
  const { postId } = await params;

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
          <PostDetailClient initialPost={getPost(postId)} />
        </section>
        <ContextRail />
      </div>
    </div>
  );
}
