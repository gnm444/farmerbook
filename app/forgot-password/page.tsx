import type { Metadata } from "next";
import Link from "next/link";
import { AuthLayout } from "@/components/auth-layout";
import { Brand } from "@/components/ui";
import { requestPasswordResetAction } from "@/features/auth/actions";

export const metadata: Metadata = { title: "Reset password" };

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; sent?: string }>;
}) {
  const { error, sent } = await searchParams;

  return (
    <AuthLayout>
      <div className="auth-card">
        <Link href="/" className="brand" aria-label="FarmerBook home">
          <Brand />
        </Link>
        <h2>Reset your password</h2>
        <p>
          Enter the email used for FarmerBook. We’ll send a secure reset link if
          the account exists.
        </p>
        {sent ? (
          <div className="notice notice--success">
            If an account matches that address, a reset email is on its way.
          </div>
        ) : (
          <form className="form-stack" action={requestPasswordResetAction}>
            {error ? <div className="notice">{error}</div> : null}
            <div className="field">
              <label htmlFor="email">Email address</label>
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
              Send reset link
            </button>
          </form>
        )}
        <div className="auth-links">
          <Link href="/login">Back to sign in</Link>
        </div>
      </div>
    </AuthLayout>
  );
}
