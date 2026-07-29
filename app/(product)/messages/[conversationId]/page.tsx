import type { Metadata } from "next";
import { ProductHeader } from "@/components/product-header";
import { MessagesClient } from "@/features/messages/messages-client";

export const metadata: Metadata = { title: "Conversation" };

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  await params;

  return (
    <div className="product-page">
      <ProductHeader
        eyebrow="Private conversation"
        title="Messages"
        description="Share practical details privately without exposing your phone number."
      />
      <MessagesClient />
    </div>
  );
}
