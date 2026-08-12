import type { Metadata } from "next";
import { ContextRail } from "@/components/context-rail";
import { ProductHeader } from "@/components/product-header";
import { FeedClient } from "@/features/posts/feed-client";
import { loadFeedPosts } from "@/features/posts/queries";
import { loadCurrentProfile } from "@/features/profiles/queries";
import { isDemoMode } from "@/lib/env";
import { getServerTranslations } from "@/lib/i18n";

export const metadata: Metadata = { title: "Feed" };

export default async function FeedPage() {
  const [currentUser, posts, { t }] = await Promise.all([
    loadCurrentProfile(),
    loadFeedPosts(),
    getServerTranslations("feed"),
  ]);

  return (
    <div className="product-page">
      <ProductHeader
        eyebrow={t("eyebrow")}
        title={t("greeting", { name: currentUser.fullName.split(" ")[0] })}
        description={t("description")}
      />
      <div className="feed-layout">
        <section className="feed-column" aria-label={t("aria")}>
          <FeedClient
            currentUser={currentUser}
            demoMode={isDemoMode()}
            initialPosts={posts}
          />
        </section>
        <ContextRail />
      </div>
    </div>
  );
}
