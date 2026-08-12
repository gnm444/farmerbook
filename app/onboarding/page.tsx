import type { Metadata } from "next";
import { OnboardingFlow } from "@/features/onboarding/onboarding-flow";
import { OnboardingShell } from "@/features/onboarding/onboarding-shell";
import { loadOnboardingProgress } from "@/features/onboarding/queries";
import { OnboardingForm } from "@/features/profiles/onboarding-form";
import { loadCurrentProfile } from "@/features/profiles/queries";
import { isFeatureEnabled } from "@/lib/feature-flags";
import {
  getServerTranslations,
} from "@/lib/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerTranslations("onboarding");
  return { title: t("title") };
}

export default async function OnboardingPage() {
  const profile = await loadCurrentProfile({ allowIncomplete: true });
  const resumableOnboarding =
    isFeatureEnabled("ENABLE_CANONICAL_AGRICULTURE_TAXONOMY") &&
    isFeatureEnabled("ENABLE_RESUMABLE_ONBOARDING");
  const agriBusinessesEnabled = isFeatureEnabled("ENABLE_AGRI_BUSINESSES");
  const extendedLocalesEnabled = isFeatureEnabled("ENABLE_EXTENDED_LOCALES");
  const progress = resumableOnboarding
    ? await loadOnboardingProgress(profile)
    : null;

  return (
    <OnboardingShell>
      {progress ? (
        <OnboardingFlow
          initialProfile={profile}
          initialProgress={progress}
          agriBusinessesEnabled={agriBusinessesEnabled}
          extendedLocalesEnabled={extendedLocalesEnabled}
        />
      ) : (
        <OnboardingForm initialProfile={profile} />
      )}
    </OnboardingShell>
  );
}
