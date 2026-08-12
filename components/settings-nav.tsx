"use client";

import Link from "next/link";
import { useTranslations } from "@/components/locale-provider";

export function SettingsNav({ current }: { current: "profile" | "account" }) {
  const t = useTranslations("navigation");
  return (
    <nav className="settings-nav" aria-label={t("settings")}>
      <Link
        href="/settings/profile"
        aria-current={current === "profile" ? "page" : undefined}
      >
        {t("profileLanguage")}
      </Link>
      <Link
        href="/settings/account"
        aria-current={current === "account" ? "page" : undefined}
      >
        {t("accountPrivacy")}
      </Link>
      <Link href="/community-rules">{t("communityRules")}</Link>
      <Link href="/privacy">{t("privacyNotice")}</Link>
    </nav>
  );
}
