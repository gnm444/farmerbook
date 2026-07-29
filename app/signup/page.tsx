import type { Metadata } from "next";
import Link from "next/link";
import { AuthLayout } from "@/components/auth-layout";
import { Brand } from "@/components/ui";
import { signupAction } from "@/features/auth/actions";

export const metadata: Metadata = { title: "Join the pilot" };

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; checkEmail?: string }>;
}) {
  const { error, checkEmail } = await searchParams;

  return (
    <AuthLayout>
      <div className="auth-card">
        <Link href="/" className="brand" aria-label="FarmerBook home">
          <Brand />
        </Link>
        <h2>Join the pilot</h2>
        <p>
          Create your account, then tell the community about your crops and
          experience.
        </p>
        {checkEmail ? (
          <div className="notice notice--success">
            Check your email to verify the account. You can sign in after
            verification.
          </div>
        ) : (
          <form className="form-stack" action={signupAction}>
            {error ? <div className="notice">{error}</div> : null}
            <div className="field">
              <label htmlFor="email">Email address</label>
              <input
                className="input"
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                required
              />
            </div>
            <div className="field">
              <label htmlFor="password">Create a password</label>
              <input
                className="input"
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
              />
              <p className="form-helper">Use at least 8 characters.</p>
            </div>
            <label className="form-check">
              <input name="acceptedTerms" type="checkbox" required />
              <span>
                I agree to the <Link href="/terms">terms</Link>,{" "}
                <Link href="/privacy">privacy notice</Link> and{" "}
                <Link href="/community-rules">community rules</Link>.
              </span>
            </label>
            <button className="button button--full" type="submit">
              Create account
            </button>
          </form>
        )}
        <div className="auth-links">
          <span>Already invited?</span>
          <Link href="/login">Sign in</Link>
        </div>
      </div>
    </AuthLayout>
  );
}
