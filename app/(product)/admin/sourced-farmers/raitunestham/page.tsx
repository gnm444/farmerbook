import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductHeader } from "@/components/product-header";
import { requireSourcedFarmerResearchOwner } from "@/features/sourced-farmers/access";
import { RaituNesthamResearchView } from "@/features/sourced-farmers/raitunestham-research-view";
import type { RaituNesthamPriority } from "@/features/sourced-farmers/raitunestham-research.server";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata: Metadata = {
  title: "Private Raitu Nestham Farmer research",
  robots: { index: false, follow: false, nocache: true },
};

export default async function RaituNesthamResearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; priority?: string }>;
}) {
  const access = await requireSourcedFarmerResearchOwner();
  if (!access.ok) notFound();

  const {
    filterRaituNesthamResearch,
    summarizeRaituNesthamResearch,
  } = await import(
    "@/features/sourced-farmers/raitunestham-research.server"
  );
  const parameters = await searchParams;
  const q = typeof parameters.q === "string" ? parameters.q.slice(0, 120) : "";
  const priority = ["recent", "method", "allied"].includes(
    parameters.priority ?? "",
  )
    ? parameters.priority as RaituNesthamPriority
    : "";
  const records = filterRaituNesthamResearch({
    q,
    priority: priority || undefined,
  });
  const summary = summarizeRaituNesthamResearch();

  return (
    <div className="product-page sourced-farmers-page">
      <ProductHeader
        eyebrow="Founder administrator · private channel research"
        title="Raitu Nestham Farmer profiles"
        description="Review the manually checked natural and organic farming profiles, public professional contacts and exact source videos. Nothing on this page is a FarmerBook membership, verification result or outreach consent."
        action={(
          <div className="report-actions">
            <Link className="button button--secondary" href="/admin/sourced-farmers">
              Back to sourced research
            </Link>
            <a
              className="button button--secondary"
              href="https://www.youtube.com/@Raitunestham"
              target="_blank"
              rel="noreferrer"
            >
              Open channel
            </a>
          </div>
        )}
      />
      <RaituNesthamResearchView records={records} summary={summary} filters={{ q, priority }} />
    </div>
  );
}
