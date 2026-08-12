import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ManagedProfileSamplePreview } from "@/features/profile-agent/sample-preview";
import { loadManagedProfileSamplePreview } from "@/features/profile-agent/actions";
import { getServerTranslations } from "@/lib/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerTranslations("profilePreview");
  return { title: t("metadataTitle"), robots: { index: false, follow: false, nocache: true }, referrer: "no-referrer" };
}

export default async function ManagedProfileSamplePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const preview = await loadManagedProfileSamplePreview(token);
  if (!preview) notFound();
  return (
    <ManagedProfileSamplePreview
      token={token}
      sample={preview.sample}
      expiresAt={preview.expiresAt}
    />
  );
}
