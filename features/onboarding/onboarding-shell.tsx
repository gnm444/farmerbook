"use client";

import Link from "next/link";
import { useTranslations } from "@/components/locale-provider";
import { Brand } from "@/components/ui";

export function OnboardingShell({ children }: { children: React.ReactNode }) {
  const common = useTranslations("common");
  const onboarding = useTranslations("onboarding");

  return (
    <main className="auth-page">
      <aside className="auth-aside">
        <Link href="/" className="brand" aria-label={common("brand")}>
          <Brand inverse />
        </Link>
        <div className="auth-quote">
          <p className="eyebrow">{onboarding("intro")}</p>
          <h1>{onboarding("roleQuestion")}</h1>
          <p>{onboarding("roleHelp")}</p>
        </div>
        <div />
      </aside>
      <section className="auth-main">
        <div className="auth-card" style={{ width: "min(620px, 100%)" }}>
          <h2>{onboarding("title")}</h2>
          <p>{onboarding("intro")}</p>
          {children}
        </div>
      </section>
    </main>
  );
}
