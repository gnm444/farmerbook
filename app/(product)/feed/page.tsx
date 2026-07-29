import type { Metadata } from "next";
import { ContextRail } from "@/components/context-rail";
import { ProductHeader } from "@/components/product-header";
import { FeedClient } from "@/features/posts/feed-client";
import { loadFeedPosts } from "@/features/posts/queries";
import { loadCurrentProfile } from "@/features/profiles/queries";

export const metadata: Metadata = { title: "Feed" };

export default async function FeedPage() {
  const [currentUser, posts] = await Promise.all([
    loadCurrentProfile(),
    loadFeedPosts(),
  ]);

  return (
    <div className="product-page">
      <ProductHeader
        eyebrow="Your community"
        title={`Good morning, ${currentUser.fullName.split(" ")[0]}`}
        description="See what farmers in your community are sharing today."
      />
      <div className="feed-layout">
        <section className="feed-column" aria-label="Community feed">
          <FeedClient currentUser={currentUser} initialPosts={posts} />
        </section>
        <ContextRail />
      </div>
    </div>
  );
}
