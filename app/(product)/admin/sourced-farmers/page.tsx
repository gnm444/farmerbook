import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductHeader } from "@/components/product-header";
import { requireSourcedFarmerResearchOwner } from "@/features/sourced-farmers/access";
import { loadSourcedFarmerDashboard } from "@/features/sourced-farmers/queries";
import { SourcedFarmerConsole } from "@/features/sourced-farmers/sourced-farmer-console";
import { sourcedFarmerYouTubeConfiguration } from "@/features/sourced-farmers/youtube-client";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata: Metadata = {
  title: "Private sourced Farmer research",
  robots: { index: false, follow: false, nocache: true },
};

export default async function SourcedFarmersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; review?: string; page?: string }>;
}) {
  const access = await requireSourcedFarmerResearchOwner();
  if (!access.ok) notFound();

  const parameters = await searchParams;
  const q = typeof parameters.q === "string" ? parameters.q.slice(0, 120) : "";
  const review = ["pending", "approved", "rejected", "archived"].includes(
    parameters.review ?? "",
  )
    ? parameters.review as "pending" | "approved" | "rejected" | "archived"
    : "";
  const requestedPage = Number.parseInt(parameters.page ?? "1", 10);
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0
    ? requestedPage
    : 1;
  const dashboard = await loadSourcedFarmerDashboard({
    q,
    review: review || undefined,
    page,
  });

  return (
    <div className="product-page sourced-farmers-page">
      <ProductHeader
        eyebrow="Founder administrator · private research"
        title="Sourced Farmer research"
        description="Run a single checkpointed YouTube batch, inspect contact-free transient sources, and review only durable profiles backed by eligible independent evidence or documented subject consent."
        action={<div className="report-actions"><Link className="button button--secondary" href="/admin/farmer-database">Private Farmer database</Link><Link className="button button--secondary" href="/admin/agents">Managed agents</Link></div>}
      />
      <SourcedFarmerConsole
        dashboard={dashboard}
        youtubeConfigured={sourcedFarmerYouTubeConfiguration().configured}
        initialFilters={{ q, review }}
      />
    </div>
  );
}
