import type { Metadata } from "next";
import Link from "next/link";
import { ProductHeader } from "@/components/product-header";
import { requireAdmin } from "@/features/auth/require-admin";
import { loadBlogAgentDesk } from "@/features/blog/admin-queries";
import { BlogAgentConsole } from "@/features/blog/blog-agent-console";

export const metadata: Metadata = { title: "Blog Writing Agent" };

export default async function BlogAgentPage() {
  await requireAdmin();
  const desk = await loadBlogAgentDesk();
  return (
    <div className="product-page">
      <ProductHeader
        eyebrow="Administrator · evidence-aware publishing"
        title="FarmerBook Blog Writing Agent"
        description="A dedicated Cloudflare Agent prepares at most one source-bounded private draft every day at 09:00 IST and translates approved articles. It cannot publish a new article until an authenticated administrator reviews the exact revision and records an explicit decision."
        action={<div className="report-actions"><Link className="button button--secondary" href="/blog">Open public blog</Link><Link className="button button--secondary" href="/admin/agents">Open agent fleet</Link></div>}
      />
      <BlogAgentConsole {...desk} />
    </div>
  );
}
