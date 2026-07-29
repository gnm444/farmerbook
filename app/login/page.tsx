import type { Metadata } from "next";
import Link from "next/link";
import { AuthLayout } from "@/components/auth-layout";
import { Brand } from "@/components/ui";
import { loginAction } from "@/features/auth/actions";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <AuthLayout>
      <div className="auth-card">
        <Link href="/" className="brand" aria-label="FarmerBook home">
          <Brand />
        </Link>
        <h2>Welcome back</h2>
        <p>Sign in to continue learning with your farming community.</p>
        <form className="form-stack" action={loginAction}>
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
            <label htmlFor="password">Password</label>
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
            Sign in
          </button>
        </form>
        <div className="auth-links">
          <Link href="/signup">Request pilot access</Link>
          <Link href="/forgot-password">Forgot password?</Link>
        </div>
      </div>
    </AuthLayout>
  );
}
