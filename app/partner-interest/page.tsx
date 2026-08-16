import type { Metadata } from "next";
import { PublicFooter } from "@/components/public-footer";
import { PublicHeader } from "@/components/public-header";
import { isOutreachConsentIntakeConfigured } from "@/features/outreach/configuration";
import { ConsentJoinExperience } from "@/features/outreach/consent-join-experience";
import { createConsentToken } from "@/features/outreach/consent-token";

export const metadata: Metadata = {
  title: "Partner with FarmerBook",
  description:
    "Farmer groups, associations, educators and agriculture organizations can request a consent-verified FarmerBook partnership introduction.",
};

export default async function PartnerInterestPage() {
  const signingSecret = process.env.OUTREACH_CONSENT_SIGNING_SECRET ?? "";
  const configured = isOutreachConsentIntakeConfigured();
  const consentNonce = configured ? await createConsentToken(signingSecret) : "";

  return (
    <>
      <PublicHeader />
      <ConsentJoinExperience
        configured={configured}
        consentNonce={consentNonce}
        turnstileSiteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? ""}
        locales={["en-IN"]}
        engagementType="collaboration"
        campaignCode="partner-interest"
      />
      <PublicFooter />
    </>
  );
}
