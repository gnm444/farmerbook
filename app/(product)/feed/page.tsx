import type { Metadata } from "next";
import { ContextRail } from "@/components/context-rail";
import { ProductHeader } from "@/components/product-header";
import { FeedClient } from "@/features/posts/feed-client";

export const metadata: Metadata = { title: "Feed" };

export default function FeedPage() {
  return (
    <div className="product-page">
      <ProductHeader
        eyebrow="Your community"
        title="Good morning, Meera"
        description="See what farmers in your community are sharing today."
      />
      <div className="feed-layout">
        <section className="feed-column" aria-label="Community feed">
          <FeedClient />
        </section>
        <ContextRail />
      </div>
    </div>
  );
}
