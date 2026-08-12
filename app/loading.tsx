import { getServerTranslations } from "@/lib/i18n";

export default async function Loading() {
  const { t } = await getServerTranslations("errors");
  return (
    <main className="container section" aria-busy="true" aria-live="polite">
      <section className="card empty-state">
        <div>
          <h1>{t("loading")}</h1>
          <p>{t("loadingHelp")}</p>
        </div>
      </section>
    </main>
  );
}
