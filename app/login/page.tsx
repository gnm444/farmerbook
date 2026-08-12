import type { Metadata } from "next";
import Link from "next/link";
import { AuthLayout } from "@/components/auth-layout";
import { Brand } from "@/components/ui";
import { loginAction } from "@/features/auth/actions";
import { OAuthButtons } from "@/features/auth/oauth-buttons";
import { publicAuthErrorMessage } from "@/features/auth/redirects";
import { getServerI18n } from "@/lib/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerI18n();
  return { title: t("auth.signIn") };
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const { t } = await getServerI18n();
  const visibleError = error
    ? publicAuthErrorMessage(error) ?? t("errors.generic")
    : null;

  return (
    <AuthLayout>
      <div className="auth-card">
        <Link href="/" className="brand" aria-label={t("navigation.homeAria")}>
          <Brand />
        </Link>
        <h2>{t("auth.welcomeBack")}</h2>
        <p>{t("auth.signInHelp")}</p>
        {visibleError ? (
          <div className="notice" role="alert">
            {visibleError}
          </div>
        ) : null}
        <OAuthButtons mode="login" />
        <form className="form-stack" action={loginAction}>
          <div className="field">
            <label htmlFor="email">{t("auth.email")}</label>
            <input
              className="input"
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder={t("auth.emailPlaceholder")}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="password">{t("auth.password")}</label>
            <input
              className="input"
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </div>
          <button className="button button--full" type="submit">
            {t("auth.signIn")}
          </button>
        </form>
        <p className="auth-terms-note">
          {t("legal.consentBeforeTerms")}<Link href="/terms">{t("legal.terms")}</Link>
          {t("legal.consentBetweenTermsPrivacy")}<Link href="/privacy">{t("legal.privacy")}</Link>
          {t("legal.consentBetweenPrivacyRules")}<Link href="/community-rules">{t("legal.communityRules")}</Link>
          {t("legal.consentAfterRules")}
        </p>
        <div className="auth-links">
          <Link href="/signup">{t("auth.requestPilot")}</Link>
          <Link href="/forgot-password">{t("auth.forgotPassword")}</Link>
        </div>
      </div>
    </AuthLayout>
  );
}
