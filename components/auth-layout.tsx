import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { Brand } from "@/components/ui";
import { getServerI18n } from "@/lib/i18n";

export async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { t } = await getServerI18n();
  return (
    <main className="auth-page">
      <aside className="auth-aside">
        <Link href="/" className="brand" aria-label={t("navigation.homeAria")}>
          <Brand inverse />
        </Link>
        <div className="auth-quote">
          <p className="eyebrow">{t("auth.trustEyebrow")}</p>
          <h1>{t("auth.learnTitle")}</h1>
          <p>{t("auth.trustBody")}</p>
        </div>
        <div className="auth-proof">
          <ShieldCheck size={20} aria-hidden="true" />
          {t("auth.pilotProof")}
        </div>
      </aside>
      <section className="auth-main">{children}</section>
    </main>
  );
}
