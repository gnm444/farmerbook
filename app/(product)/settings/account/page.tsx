import type { Metadata } from "next";
import { ProductHeader } from "@/components/product-header";
import { SettingsNav } from "@/components/settings-nav";
import { AccountSettings } from "@/features/profiles/account-settings";
import { getServerTranslations } from "@/lib/i18n";

export const metadata: Metadata = { title: "Account settings" };

export default async function AccountSettingsPage() {
  const { t } = await getServerTranslations("settings");
  return (
    <div className="product-page">
      <ProductHeader
        eyebrow={t("privacyEyebrow")}
        title={t("accountTitle")}
        description={t("accountDescription")}
      />
      <div className="settings-layout">
        <SettingsNav current="account" />
        <AccountSettings />
      </div>
    </div>
  );
}
