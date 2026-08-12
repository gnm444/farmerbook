import type { Metadata } from "next";
import Link from "next/link";
import { AuthLayout } from "@/components/auth-layout";
import { Brand } from "@/components/ui";
import { verifyEmailUnsubscribeToken } from "@/features/outreach/email-action-token";

export const metadata: Metadata = {
  title: "Stop FarmerBook emails",
  robots: { index: false, follow: false },
};

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; status?: string }>;
}) {
  const { token = "", status } = await searchParams;
  const valid = token
    ? Boolean(
        await verifyEmailUnsubscribeToken(
          token,
          process.env.OUTREACH_EMAIL_ACTION_SIGNING_SECRET ?? "",
        ),
      )
    : false;

  return (
    <AuthLayout>
      <div className="auth-card">
        <Link href="/" className="brand" aria-label="FarmerBook home">
          <Brand />
        </Link>
        <h2>Stop FarmerBook emails</h2>
        {status === "unsubscribed" ? (
          <div className="notice notice--success">
            You have been unsubscribed. Pending outreach was cancelled and this
            contact will remain suppressed.
          </div>
        ) : status === "invalid" || (!valid && !status) ? (
          <div className="notice">This unsubscribe link is invalid or expired.</div>
        ) : status === "unavailable" ? (
          <div className="notice">
            Unsubscribe is temporarily unavailable. Reply STOP to the original
            message and contact the privacy address in the notice.
          </div>
        ) : (
          <>
            <p>
              This immediately withdraws outreach consent, cancels pending
              messages and suppresses the contact from future imports.
            </p>
            <form method="post" action="/api/outreach/email/unsubscribe">
              <input type="hidden" name="token" value={token} />
              <button className="button button--full" type="submit">
                Unsubscribe me
              </button>
            </form>
          </>
        )}
        <div className="auth-links">
          <Link href="/privacy">Privacy notice</Link>
          <Link href="/">FarmerBook home</Link>
        </div>
      </div>
    </AuthLayout>
  );
}
