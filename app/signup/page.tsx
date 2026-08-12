import type { Metadata } from "next";
import Link from "next/link";
import { AuthLayout } from "@/components/auth-layout";
import { Brand } from "@/components/ui";
import { signupAction } from "@/features/auth/actions";
import { OAuthButtons } from "@/features/auth/oauth-buttons";
import { getServerI18n } from "@/lib/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerI18n();
  return { title: t("auth.joinTitle") };
}

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    checkEmail?: string;
    invite?: "invited" | "invalid" | "unavailable";
  }>;
}) {
  const { error, checkEmail, invite } = await searchParams;
  const { t } = await getServerI18n();

  return (
    <AuthLayout>
      <div className="auth-card">
        <Link href="/" className="brand" aria-label={t("navigation.homeAria")}>
          <Brand />
        </Link>
        <h2>{t("auth.joinTitle")}</h2>
        <p>{t("auth.joinHelp")}</p>
        {invite === "invited" ? (
          <div className="notice notice--success">
            {t("auth.inviteReady")}
          </div>
        ) : null}
        {invite === "invalid" ? (
          <div className="notice">
            {t("auth.inviteInvalid")}
          </div>
        ) : null}
        {invite === "unavailable" ? (
          <div className="notice">
            {t("auth.inviteUnavailable")}
          </div>
        ) : null}
        {checkEmail ? (
          <div className="notice notice--success">
            {t("auth.checkEmailDetail")}
          </div>
        ) : (
          <>
            {error ? <div className="notice">{t("errors.generic")}</div> : null}
            <OAuthButtons mode="signup" />
            <form className="form-stack" action={signupAction}>
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
              <label htmlFor="password">{t("auth.createPassword")}</label>
              <input
                className="input"
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
              />
              <p className="form-helper">{t("auth.passwordHelp")}</p>
            </div>
            <label className="form-check">
              <input name="acceptedTerms" type="checkbox" required />
              <span>
                {t("legal.consentBeforeTerms")}<Link href="/terms">{t("legal.terms")}</Link>
                {t("legal.consentBetweenTermsPrivacy")}<Link href="/privacy">{t("legal.privacy")}</Link>
                {t("legal.consentBetweenPrivacyRules")}<Link href="/community-rules">{t("legal.communityRules")}</Link>
                {t("legal.consentAfterRules")}
              </span>
            </label>
            <button className="button button--full" type="submit">
              {t("auth.signUp")}
            </button>
            </form>
          </>
        )}
        <div className="auth-links">
          <span>{t("auth.alreadyInvited")}</span>
          <Link href="/login">{t("auth.signIn")}</Link>
        </div>
      </div>
    </AuthLayout>
  );
}
