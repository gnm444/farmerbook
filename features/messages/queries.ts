import { requireUser } from "@/features/auth/require-user";
import {
  loadCurrentProfile,
  loadProfilesByIds,
} from "@/features/profiles/queries";
import {
  conversations as demoConversations,
  getProfile,
  messages as demoMessages,
} from "@/lib/demo-data";
import { createdLabel } from "@/lib/data-mappers";
import { isDemoMode, isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import type { Conversation, FarmerProfile, Message } from "@/lib/types";

export async function loadMessagesData(requestedProfileId?: string): Promise<{
  currentProfile: FarmerProfile;
  conversations: Conversation[];
  messages: Message[];
  profiles: FarmerProfile[];
}> {
  if (!isSupabaseConfigured()) {
    if (!isDemoMode()) throw new Error("FarmerBook messaging is not configured.");
    const profiles = [
      ...new Map(
        demoConversations.map((conversation) => {
          const profile = getProfile(conversation.otherProfileId);
          return [profile.id, profile] as const;
        }),
      ).values(),
    ];
    if (requestedProfileId) {
      const requested = getProfile(requestedProfileId);
      if (!profiles.some((profile) => profile.id === requested.id)) {
        profiles.push(requested);
      }
    }
    return {
      currentProfile: getProfile("meera"),
      conversations: demoConversations.map((conversation) => ({
        ...conversation,
        otherProfile: getProfile(conversation.otherProfileId),
      })),
      messages: demoMessages,
      profiles,
    };
  }

  const user = await requireUser();
  const supabase = await createClient();
  const { data: pairs, error: pairError } = await supabase
    .from("direct_conversation_pairs")
    .select("conversation_id, user_low, user_high")
    .or(`user_low.eq.${user.id},user_high.eq.${user.id}`);

  if (pairError) throw new Error(pairError.message);

  const conversationIds = (pairs ?? []).map(
    (pair) => pair.conversation_id as string,
  );
  const otherIds = (pairs ?? []).map((pair) =>
    pair.user_low === user.id
      ? (pair.user_high as string)
      : (pair.user_low as string),
  );
  if (requestedProfileId) otherIds.push(requestedProfileId);

  const [profiles, currentProfile] = await Promise.all([
    loadProfilesByIds([...new Set(otherIds)]),
    loadCurrentProfile(),
  ]);
  const byId = new Map(profiles.map((profile) => [profile.id, profile]));

  if (!conversationIds.length) {
    return { currentProfile, conversations: [], messages: [], profiles };
  }

  const [{ data: conversationRows, error: conversationError }, { data: messageRows, error: messageError }] =
    await Promise.all([
      supabase
        .from("conversations")
        .select("id, updated_at")
        .in("id", conversationIds),
      supabase
        .from("messages")
        .select("id, conversation_id, sender_id, body, created_at")
        .in("conversation_id", conversationIds)
        .eq("status", "active")
        .order("created_at", { ascending: true }),
    ]);

  if (conversationError || messageError) {
    throw new Error(conversationError?.message ?? messageError?.message);
  }

  const pairByConversation = new Map(
    (pairs ?? []).map((pair) => [pair.conversation_id as string, pair]),
  );
  const latestByConversation = new Map<string, string>();
  for (const message of messageRows ?? []) {
    latestByConversation.set(
      message.conversation_id as string,
      message.body as string,
    );
  }

  const conversations = (conversationRows ?? []).flatMap<Conversation>(
    (row) => {
      const pair = pairByConversation.get(row.id as string);
      if (!pair) return [];
      const otherProfileId =
        pair.user_low === user.id
          ? (pair.user_high as string)
          : (pair.user_low as string);
      return [{
        id: row.id as string,
        otherProfileId,
        otherProfile: byId.get(otherProfileId),
        lastMessage:
          latestByConversation.get(row.id as string) ??
          "Start a useful conversation.",
        updatedLabel: createdLabel(row.updated_at as string),
        unread: 0,
      }];
    },
  );

  return {
    currentProfile,
    conversations,
    profiles,
    messages: (messageRows ?? []).map((message) => ({
      id: message.id as string,
      conversationId: message.conversation_id as string,
      senderId: message.sender_id as string,
      body: message.body as string,
      createdLabel: createdLabel(message.created_at as string),
    })),
  };
}
