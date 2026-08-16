import type { Metadata } from "next";
import Link from "next/link";
import { AuthLayout } from "@/components/auth-layout";
import { Brand } from "@/components/ui";
import { verifyEmailConsentToken } from "@/features/outreach/email-action-token";
import { getServerI18n } from "@/lib/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerI18n();
  return { title: t("auth.confirmTitle"), robots: { index: false, follow: false } };
}

export default async function ConfirmEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; status?: string }>;
}) {
  const { token = "", status } = await searchParams;
  const { t } = await getServerI18n();
  const payload = token
    ? await verifyEmailConsentToken(
        token,
        process.env.OUTREACH_EMAIL_ACTION_SIGNING_SECRET ?? "",
      )
    : null;
  const valid = Boolean(payload);

  return (
    <AuthLayout>
      <div className="auth-card">
        <Link href="/" className="brand" aria-label={t("navigation.homeAria")}>
          <Brand />
        </Link>
        <h2>{t("auth.confirmTitle")}</h2>
        {status === "confirmed" || status === "confirmed-collaboration" ? (
          <>
            <div className="notice notice--success">
              {t("auth.confirmed")}
            </div>
            <Link
              className="button button--full"
              href={status === "confirmed-collaboration" ? "/" : "/signup"}
            >
              {status === "confirmed-collaboration"
                ? t("auth.returnToFarmerBook")
                : t("auth.createFarmerBookAccount")}
            </Link>
          </>
        ) : status === "invalid" || (!valid && !status) ? (
          <div className="notice">
            {t("auth.confirmationInvalid")}
          </div>
        ) : status === "unavailable" ? (
          <div className="notice">
            {t("auth.confirmationUnavailable")}
          </div>
        ) : (
          <>
            <p>{t("auth.confirmationHelp")}</p>
            <form method="post" action="/api/outreach/email/confirm">
              <input type="hidden" name="token" value={token} />
              <button className="button button--full" type="submit">
                {t("auth.confirmRequest")}
              </button>
            </form>
          </>
        )}
        <div className="auth-links">
          <Link
            href={
              payload?.engagementType === "collaboration"
                ? "/partner-interest"
                : "/join"
            }
          >
            {t("auth.requestNewConfirmation")}
          </Link>
          <Link href="/privacy">{t("auth.privacy")}</Link>
        </div>
      </div>
    </AuthLayout>
  );
}
