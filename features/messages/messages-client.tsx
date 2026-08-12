"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { MoreHorizontal, Search, Send } from "lucide-react";
import { Avatar, VerifiedBadge } from "@/components/ui";
import type {
  Conversation,
  FarmerProfile,
  Message,
} from "@/lib/types";
import {
  sendMessageAction,
  startConversationAction,
} from "./actions";

export function MessagesClient({
  requestedProfileId,
  initialConversationId,
  currentProfile,
  initialConversations,
  initialMessages,
  profiles,
}: {
  requestedProfileId?: string;
  initialConversationId?: string;
  currentProfile: FarmerProfile;
  initialConversations: Conversation[];
  initialMessages: Message[];
  profiles: FarmerProfile[];
}) {
  const profileDirectory = useMemo(
    () => new Map(profiles.map((profile) => [profile.id, profile])),
    [profiles],
  );
  const preparedConversations = useMemo(() => {
    if (
      !requestedProfileId ||
      initialConversations.some(
        (conversation) => conversation.otherProfileId === requestedProfileId,
      )
    ) {
      return initialConversations;
    }
    const requested = profileDirectory.get(requestedProfileId);
    if (!requested) return initialConversations;
    return [
      {
        id: `new-${requested.id}`,
        otherProfileId: requested.id,
        otherProfile: requested,
        lastMessage: "Start a useful conversation.",
        updatedLabel: "New",
        unread: 0,
      },
      ...initialConversations,
    ];
  }, [initialConversations, profileDirectory, requestedProfileId]);

  const requestedConversation = preparedConversations.find(
    (conversation) => conversation.otherProfileId === requestedProfileId,
  );
  const [selectedId, setSelectedId] = useState(
    initialConversationId ??
      requestedConversation?.id ??
      preparedConversations[0]?.id ??
      "",
  );
  const [conversations, setConversations] =
    useState<Conversation[]>(preparedConversations);
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [body, setBody] = useState("");
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  const selected =
    conversations.find((conversation) => conversation.id === selectedId) ??
    conversations[0];
  const otherProfile = selected
    ? selected.otherProfile ??
      profileDirectory.get(selected.otherProfileId)
    : undefined;
  const visibleMessages = messages.filter(
    (message) => message.conversationId === selected?.id,
  );
  const visibleConversations = conversations.filter((conversation) => {
    const profile =
      conversation.otherProfile ??
      profileDirectory.get(conversation.otherProfileId);
    return profile?.fullName.toLowerCase().includes(search.toLowerCase());
  });

  async function sendMessage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanBody = body.trim();
    if (!cleanBody || !selected || !otherProfile) return;

    setSending(true);
    setError("");
    let conversationId = selected.id;
    if (conversationId.startsWith("new-")) {
      const conversationResult = await startConversationAction(
        selected.otherProfileId,
      );
      if (!conversationResult.ok) {
        setError(
          conversationResult.message ?? "The conversation could not be started.",
        );
        setSending(false);
        return;
      }
      conversationId = conversationResult.conversationId;
    }

    const result = await sendMessageAction({
      conversationId,
      body: cleanBody,
    });
    if (!result.ok) {
      setError(result.message ?? "The message could not be sent.");
      setSending(false);
      return;
    }

    const newMessage: Message = {
      id: `message-${Date.now()}`,
      conversationId,
      senderId: currentProfile.id,
      body: cleanBody,
      createdLabel: "Now",
    };
    setMessages((current) => [...current, newMessage]);
    setConversations((current) =>
      current.map((conversation) =>
        conversation.id === selected.id
          ? {
              ...conversation,
              id: conversationId,
              lastMessage: cleanBody,
              updatedLabel: "Now",
              unread: 0,
            }
          : conversation,
      ),
    );
    setSelectedId(conversationId);
    setBody("");
    setSending(false);
  }

  if (!selected || !otherProfile) {
    return (
      <section className="card empty-state">
        <div>
          <h2>No conversations yet</h2>
          <p>Find a participant and start a focused one-to-one conversation.</p>
          <Link className="button" href="/discover">
            Discover people
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="card messages-layout" aria-label="Direct messages">
      <aside className="conversation-list">
        <div className="conversation-list__head">
          <h2>Conversations</h2>
          <div className="filter-search">
            <Search size={17} aria-hidden="true" />
            <label className="sr-only" htmlFor="conversation-search">
              Search conversations
            </label>
            <input
              className="input"
              id="conversation-search"
              placeholder="Search conversations"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        </div>
        {visibleConversations.map((conversation) => {
          const profile =
            conversation.otherProfile ??
            profileDirectory.get(conversation.otherProfileId);
          if (!profile) return null;
          return (
            <button
              className="conversation-item"
              type="button"
              key={conversation.id}
              aria-current={
                conversation.id === selected.id ? "true" : undefined
              }
              onClick={() => {
                setSelectedId(conversation.id);
                setConversations((current) =>
                  current.map((item) =>
                    item.id === conversation.id
                      ? { ...item, unread: 0 }
                      : item,
                  ),
                );
              }}
            >
              <Avatar
                initials={profile.initials}
                imageUrl={profile.avatarUrl}
                role={profile.accountRole}
                size="small"
              />
              <span className="conversation-copy">
                <span className="conversation-line">
                  <strong>{profile.fullName}</strong>
                  <span className="conversation-time">
                    {conversation.updatedLabel}
                  </span>
                </span>
                <span className="conversation-preview">
                  {conversation.lastMessage}
                </span>
              </span>
              {conversation.unread ? (
                <span className="unread">{conversation.unread}</span>
              ) : null}
            </button>
          );
        })}
      </aside>
      <div className="message-panel">
        <header className="message-head">
          <Avatar
            initials={otherProfile.initials}
            imageUrl={otherProfile.avatarUrl}
            role={otherProfile.accountRole}
            size="small"
          />
          <div className="person-row__copy">
            <div className="person-name">
              {otherProfile.fullName}{" "}
              {otherProfile.verified ? <VerifiedBadge /> : null}
            </div>
            <div className="person-meta">
              {otherProfile.roleLabel} · {otherProfile.district}
            </div>
          </div>
          <button className="icon-button" type="button" aria-label="Conversation options">
            <MoreHorizontal size={19} aria-hidden="true" />
          </button>
        </header>
        <div className="message-stream" aria-live="polite">
          {visibleMessages.length ? (
            visibleMessages.map((message) => (
              <div
                className={`message-bubble ${
                message.senderId === currentProfile.id
                    ? "message-bubble--own"
                    : ""
                }`}
                key={message.id}
              >
                {message.body}
                <time>{message.createdLabel}</time>
              </div>
            ))
          ) : (
            <div className="empty-state">
              <div>
                <h2>Start the conversation</h2>
                <p>
                  Introduce yourself and explain the farming topic you would like
                  to discuss.
                </p>
              </div>
            </div>
          )}
        </div>
        <form className="message-compose" onSubmit={sendMessage}>
          <label className="sr-only" htmlFor="message-body">
            Message {otherProfile.fullName}
          </label>
          <input
            className="input"
            id="message-body"
            maxLength={2000}
            onChange={(event) => setBody(event.target.value)}
            placeholder={`Message ${otherProfile.fullName}`}
            value={body}
          />
          <button
            className="button"
            type="submit"
            aria-label="Send message"
            disabled={sending}
          >
            <Send size={17} aria-hidden="true" />{" "}
            {sending ? "Sending…" : "Send"}
          </button>
        </form>
        {error ? <p className="form-error">{error}</p> : null}
      </div>
    </section>
  );
}
