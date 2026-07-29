import type { Metadata } from "next";
import { PolicyLayout } from "@/components/policy-layout";

export const metadata: Metadata = { title: "Pilot terms" };

export default function TermsPage() {
  return (
    <PolicyLayout
      eyebrow="Controlled pilot"
      title="Pilot terms"
      updated="29 July 2026"
    >
      <p className="placeholder-note">
        Founder and qualified legal review are required before real invitations
        are sent. These draft terms describe the intended product behavior for
        usability testing.
      </p>
      <h2>Purpose of the pilot</h2>
      <p>
        FarmerBook is an early professional-networking service for invited
        agriculture participants. Features may change, experience disruption or
        be withdrawn while the pilot team evaluates usefulness and safety.
      </p>
      <h2>Not professional or emergency advice</h2>
      <p>
        Community posts are participant contributions, not guaranteed
        agronomic, medical, legal or financial advice. Verify high-impact
        decisions with a qualified local professional and follow product labels
        and applicable law.
      </p>
      <h2>Your responsibilities</h2>
      <p>
        Keep your account secure, provide an honest profile, respect the
        community rules and use only content you have permission to share. Do
        not attempt to access another participant’s account or private
        conversation.
      </p>
      <h2>Moderation</h2>
      <p>
        The pilot team may hide content, restrict features or suspend an account
        when reasonably necessary for safety, rule enforcement or technical
        protection. Moderator actions are recorded for review.
      </p>
    </PolicyLayout>
  );
}
