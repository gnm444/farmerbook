"use client";

import { useMemo, useState } from "react";
import { MoreHorizontal, Search, Send } from "lucide-react";
import { Avatar, VerifiedBadge } from "@/components/ui";
import {
  conversations as initialConversations,
  currentUserId,
  getProfile,
  messages as initialMessages,
} from "@/lib/demo-data";
import type { Conversation, Message } from "@/lib/types";

export function MessagesClient({ requestedProfileId }: { requestedProfileId?: string }) {
  const preparedConversations = useMemo(() => {
    if (
      !requestedProfileId ||
      initialConversations.some(
        (conversation) => conversation.otherProfileId === requestedProfileId,
      )
    ) {
      return initialConversations;
    }
    const requested = getProfile(requestedProfileId);
    return [
      {
        id: `conversation-${requested.id}`,
        otherProfileId: requested.id,
        lastMessage: "Start a useful conversation.",
        updatedLabel: "New",
        unread: 0,
      },
      ...initialConversations,
    ];
  }, [requestedProfileId]);

  const requestedConversation = preparedConversations.find(
    (conversation) => conversation.otherProfileId === requestedProfileId,
  );
  const [selectedId, setSelectedId] = useState(
    requestedConversation?.id ?? preparedConversations[0].id,
  );
  const [conversations, setConversations] =
    useState<Conversation[]>(preparedConversations);
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [body, setBody] = useState("");

  const selected =
    conversations.find((conversation) => conversation.id === selectedId) ??
    conversations[0];
  const otherProfile = getProfile(selected.otherProfileId);
  const visibleMessages = messages.filter(
    (message) => message.conversationId === selected.id,
  );

  function sendMessage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanBody = body.trim();
    if (!cleanBody) return;

    const newMessage: Message = {
      id: `message-${Date.now()}`,
      conversationId: selected.id,
      senderId: currentUserId,
      body: cleanBody,
      createdLabel: "Now",
    };
    setMessages((current) => [...current, newMessage]);
    setConversations((current) =>
      current.map((conversation) =>
        conversation.id === selected.id
          ? {
              ...conversation,
              lastMessage: cleanBody,
              updatedLabel: "Now",
              unread: 0,
            }
          : conversation,
      ),
    );
    setBody("");
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
            />
          </div>
        </div>
        {conversations.map((conversation) => {
          const profile = getProfile(conversation.otherProfileId);
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
              <Avatar initials={profile.initials} size="small" />
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
          <Avatar initials={otherProfile.initials} size="small" />
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
                  message.senderId === currentUserId
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
          <button className="button" type="submit" aria-label="Send message">
            <Send size={17} aria-hidden="true" /> Send
          </button>
        </form>
      </div>
    </section>
  );
}
