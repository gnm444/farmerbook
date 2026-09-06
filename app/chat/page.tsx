import type { Metadata } from "next";
import Link from "next/link";
import { WebsiteGreetingAgent } from "@/components/website-greeting-agent";
import { Brand } from "@/components/ui";

export const metadata: Metadata = {
  title: "Chat canary",
  description:
    "A dedicated FarmerBook conversation canary in English, Telugu and Hindi.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function ChatPage() {
  return (
    <main className="chat-canary-page">
      <header className="chat-canary-page__header">
        <Link href="/" aria-label="FarmerBook home">
          <Brand />
        </Link>
        <span>Local canary · కానరీ · कैनरी</span>
      </header>

      <section className="chat-canary-page__intro" aria-labelledby="chat-canary-title">
        <p className="eyebrow">English · తెలుగు · हिन्दी</p>
        <h1 id="chat-canary-title">FarmerBook Chat</h1>
        <p>Choose your chat language below, then ask a FarmerBook question.</p>
      </section>

      <WebsiteGreetingAgent
        mode="embedded"
        showCanaryStatus
        surface="chat_canary"
      />
    </main>
  );
}
