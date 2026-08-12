import Link from "next/link";
import { PublicFooter } from "@/components/public-footer";
import { PublicHeader } from "@/components/public-header";
import { getServerTranslations } from "@/lib/i18n";

export async function PolicyLayout({
  eyebrow,
  title,
  updated,
  children,
}: {
  eyebrow: string;
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  const { t } = await getServerTranslations("legal");
  const email = process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "pilot@farmerbook.example";
  return (
    <div className="policy-page">
      <PublicHeader />
      <main>
        <article className="card policy-article">
          <p className="eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          <p className="muted">{t("lastUpdated", { date: updated })}</p>
          {children}
          <p><a href={`mailto:${email}`}>{t("questions", { email })}</a></p>
          <p>
            <Link href="/">{t("returnHome")}</Link>
          </p>
        </article>
      </main>
      <PublicFooter />
    </div>
  );
}
