import Link from "next/link";
import { SearchX } from "lucide-react";
import { getServerTranslations } from "@/lib/i18n";

export default async function NotFound() {
  const { t } = await getServerTranslations("errors");
  return (
    <main className="container" style={{ padding: "100px 0" }}>
      <section className="card empty-state">
        <div>
          <div className="empty-state__icon">
            <SearchX size={28} aria-hidden="true" />
          </div>
          <h1>{t("notFoundTitle")}</h1>
          <p>{t("notFoundHelp")}</p>
          <Link className="button" href="/feed">
            {t("returnFeed")}
          </Link>
        </div>
      </section>
    </main>
  );
}
