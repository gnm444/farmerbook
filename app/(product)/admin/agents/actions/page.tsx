import type { Metadata } from "next";
import Link from "next/link";
import { ProductHeader } from "@/components/product-header";
import { LiveActionConsole } from "@/features/action-control/action-console";
import { loadLiveActionConsole } from "@/features/action-control/queries";

export const metadata: Metadata = { title: "Live-action control plane" };

export default async function LiveActionControlPage() {
  const data = await loadLiveActionConsole();
  return (
    <div className="product-page">
      <ProductHeader
        eyebrow="Administrator · action authorization"
        title="Agent execution controls"
        description="Inspect redacted authorizations, independent approvals, executor caps, receipts and verification state. Phase 1 starts default-off and does not grant a universal executor credential."
        action={<Link className="button button--secondary" href="/admin/agents">Back to Agent fleet</Link>}
      />
      <LiveActionConsole {...data} />
    </div>
  );
}
