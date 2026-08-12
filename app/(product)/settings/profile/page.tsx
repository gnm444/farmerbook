import type { Metadata } from "next";
import { ProductHeader } from "@/components/product-header";
import { SettingsNav } from "@/components/settings-nav";
import { ProfileSettingsForm } from "@/features/profiles/profile-settings-form";
import { loadCurrentProfile } from "@/features/profiles/queries";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { getServerTranslations } from "@/lib/i18n";

export const metadata: Metadata = { title: "Profile settings" };

export default async function ProfileSettingsPage() {
  const [profile, { t }] = await Promise.all([
    loadCurrentProfile(),
    getServerTranslations("settings"),
  ]);

  return (
    <div className="product-page">
      <ProductHeader
        eyebrow={t("preferencesEyebrow")}
        title={t("title")}
        description={t("profileDescription")}
      />
      <div className="settings-layout">
        <SettingsNav current="profile" />
        <ProfileSettingsForm
          profile={profile}
          extendedLocalesEnabled={isFeatureEnabled("ENABLE_EXTENDED_LOCALES")}
        />
      </div>
    </div>
  );
}
