import type { Metadata } from "next";
import { ProductHeader } from "@/components/product-header";
import { MessagesClient } from "@/features/messages/messages-client";
import { loadMessagesData } from "@/features/messages/queries";

export const metadata: Metadata = { title: "Conversation" };

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const { conversationId } = await params;
  const data = await loadMessagesData();

  return (
    <div className="product-page">
      <ProductHeader
        eyebrow="Private conversation"
        title="Messages"
        description="Share practical details privately without exposing your phone number."
      />
      <MessagesClient
        initialConversationId={conversationId}
        currentProfile={data.currentProfile}
        initialConversations={data.conversations}
        initialMessages={data.messages}
        profiles={data.profiles}
      />
    </div>
  );
}
