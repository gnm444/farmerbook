import { getCloudflareBindings } from "@/lib/cloudflare-bindings";
import type { MarketplaceMatchingAgent } from "./matching-agent";

export async function marketplaceMatchingAgentStub() {
  const bindings = await getCloudflareBindings();
  if (!bindings?.MARKETPLACE_MATCHING_AGENT) return null;
  const { getAgentByName } = await import("agents");
  return getAgentByName(
    bindings.MARKETPLACE_MATCHING_AGENT,
    "farmerbook-marketplace-matching",
  ) as Promise<DurableObjectStub<MarketplaceMatchingAgent>>;
}
