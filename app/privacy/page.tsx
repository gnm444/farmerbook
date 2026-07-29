import type { Metadata } from "next";
import { PolicyLayout } from "@/components/policy-layout";

export const metadata: Metadata = { title: "Privacy notice" };

export default function PrivacyPage() {
  return (
    <PolicyLayout
      eyebrow="Your information"
      title="Privacy notice"
      updated="29 July 2026"
    >
      <p className="placeholder-note">
        Legal and retention review is a release gate. The controlled pilot must
        remain closed until this notice names the operating entity, lawful
        basis, retention periods and local contact details.
      </p>
      <h2>Information the pilot collects</h2>
      <p>
        FarmerBook stores account details, the profile fields you choose,
        posts, comments, helpful reactions, follow relationships, reports and
        direct messages. It records small product events such as profile
        completion or a sent message without copying message bodies into
        analytics.
      </p>
      <h2>How information is used</h2>
      <p>
        Information supports authentication, community features, safety review,
        account support and aggregate pilot learning. FarmerBook does not sell
        pilot participant data or use private messages for advertising.
      </p>
      <h2>Profile visibility</h2>
      <p>
        Profiles and posts are visible to signed-in pilot participants. The
        pilot does not intentionally expose profiles for public search-engine
        indexing. Farm size stays private unless an explicit visibility control
        says otherwise.
      </p>
      <h2>Deletion and safety records</h2>
      <p>
        Account deletion removes the participant from normal community views
        and signs them out. Limited safety or audit records may be retained for
        a reviewed period where needed to protect the community or meet legal
        duties.
      </p>
    </PolicyLayout>
  );
}
