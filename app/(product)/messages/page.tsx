import type { Metadata } from "next";
import { ProductHeader } from "@/components/product-header";
import { MessagesClient } from "@/features/messages/messages-client";

export const metadata: Metadata = { title: "Messages" };

export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ with?: string }>;
}) {
  const { with: requestedProfileId } = await searchParams;

  return (
    <div className="product-page">
      <ProductHeader
        eyebrow="Private conversations"
        title="Messages"
        description="Continue useful one-to-one conversations without sharing your phone number."
      />
      <MessagesClient requestedProfileId={requestedProfileId} />
    </div>
  );
}
