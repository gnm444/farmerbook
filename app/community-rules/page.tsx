import type { Metadata } from "next";
import { PolicyLayout } from "@/components/policy-layout";

export const metadata: Metadata = { title: "Community rules" };

export default function CommunityRulesPage() {
  return (
    <PolicyLayout
      eyebrow="Pilot safety"
      title="Community rules"
      updated="29 July 2026"
    >
      <p className="placeholder-note">
        Founder review required before the real pilot. These draft rules support
        product testing and are not a substitute for local legal review.
      </p>
      <h2>Share experience honestly</h2>
      <p>
        Explain what you observed, what you tried and the limits of your
        experience. Do not present unverified advice as a guaranteed cure,
        official instruction or substitute for a qualified professional.
      </p>
      <h2>Respect every participant</h2>
      <p>
        Harassment, threats, discriminatory language, unwanted sexual content
        and repeated unwanted contact are not allowed. Disagree with an idea
        without attacking the person.
      </p>
      <h2>Keep private information private</h2>
      <p>
        Do not publish exact farm coordinates, identity documents, financial
        details or another person’s private messages. Ask permission before
        sharing someone else’s photo or phone number.
      </p>
      <h2>No scams or unsafe promotions</h2>
      <p>
        Misleading financial offers, counterfeit inputs, unrelated advertising,
        impersonation and instructions that create an immediate safety risk may
        be removed and the account suspended.
      </p>
      <h2>Use report and block tools</h2>
      <p>
        Report content when a moderator should review it. Block a participant
        when you need to stop mutual visibility and new messages immediately.
      </p>
    </PolicyLayout>
  );
}
