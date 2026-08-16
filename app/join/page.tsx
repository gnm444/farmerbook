import type { Metadata } from "next";
import { PublicFooter } from "@/components/public-footer";
import { PublicHeader } from "@/components/public-header";
import { ConsentJoinExperience } from "@/features/outreach/consent-join-experience";
import { createConsentToken } from "@/features/outreach/consent-token";
import { isOutreachConsentIntakeConfigured } from "@/features/outreach/configuration";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from "@/lib/i18n/locales";

export const metadata: Metadata = {
  title: "Ask FarmerBook to contact you",
  description:
    "Farmers, buyers, wholesalers and agriculture businesses can request a consent-verified introduction to FarmerBook.",
};

export default async function JoinPage({
  searchParams,
}: {
  searchParams: Promise<{ campaign?: string }>;
}) {
  const { campaign } = await searchParams;
  const extendedLocalesEnabled = isFeatureEnabled("ENABLE_EXTENDED_LOCALES");
  const signingSecret = process.env.OUTREACH_CONSENT_SIGNING_SECRET ?? "";
  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";
  const configured = isOutreachConsentIntakeConfigured();
  const consentNonce = configured ? await createConsentToken(signingSecret) : "";
  const locales = extendedLocalesEnabled
    ? SUPPORTED_LOCALES
    : ([DEFAULT_LOCALE, "hi-IN", "mr-IN"] as const);

  return (
    <>
      <PublicHeader />
      <ConsentJoinExperience
        configured={configured}
        consentNonce={consentNonce}
        turnstileSiteKey={turnstileSiteKey}
        locales={locales}
        engagementType="membership"
        campaignCode={campaign === "farmer-interest" ? "farmer-interest" : "direct-join"}
      />
      <PublicFooter />
    </>
  );
}
