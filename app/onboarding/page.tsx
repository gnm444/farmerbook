import type { Metadata } from "next";
import Link from "next/link";
import { Brand } from "@/components/ui";
import { OnboardingForm } from "@/features/profiles/onboarding-form";
import { loadCurrentProfile } from "@/features/profiles/queries";

export const metadata: Metadata = { title: "Complete your profile" };

export default async function OnboardingPage() {
  const profile = await loadCurrentProfile({ allowIncomplete: true });

  return (
    <main className="auth-page">
      <aside className="auth-aside">
        <Link href="/" className="brand" aria-label="FarmerBook home">
          <Brand inverse />
        </Link>
        <div className="auth-quote">
          <p className="eyebrow">A useful professional identity</p>
          <h1>Help the right people find you.</h1>
          <p>
            Crop and district context makes FarmerBook discovery useful without
            collecting precise farm coordinates or land documents.
          </p>
        </div>
        <div />
      </aside>
      <section className="auth-main">
        <div className="auth-card" style={{ width: "min(620px, 100%)" }}>
          <h2>Complete your profile</h2>
          <p>Required fields take about two minutes.</p>
          <OnboardingForm initialProfile={profile} />
        </div>
      </section>
    </main>
  );
}
