import type { Metadata } from "next";
import Link from "next/link";
import { AuthLayout } from "@/components/auth-layout";
import { Brand } from "@/components/ui";
import { requestPasswordResetAction } from "@/features/auth/actions";
import { getServerI18n } from "@/lib/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerI18n();
  return { title: t("auth.resetTitle") };
}

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; sent?: string }>;
}) {
  const { error, sent } = await searchParams;
  const { t } = await getServerI18n();

  return (
    <AuthLayout>
      <div className="auth-card">
        <Link href="/" className="brand" aria-label={t("navigation.homeAria")}>
          <Brand />
        </Link>
        <h2>{t("auth.resetTitle")}</h2>
        <p>{t("auth.resetHelp")}</p>
        {sent ? (
          <div className="notice notice--success">
            {t("auth.resetSent")}
          </div>
        ) : (
          <form className="form-stack" action={requestPasswordResetAction}>
            {error ? <div className="notice">{t("errors.generic")}</div> : null}
            <div className="field">
              <label htmlFor="email">{t("auth.email")}</label>
              <input
                className="input"
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
              />
            </div>
            <button className="button button--full" type="submit">
              {t("auth.sendReset")}
            </button>
          </form>
        )}
        <div className="auth-links">
          <Link href="/login">{t("auth.backSignIn")}</Link>
        </div>
      </div>
    </AuthLayout>
  );
}
