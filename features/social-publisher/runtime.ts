import { getCloudflareBindings } from "@/lib/cloudflare-bindings";
import type { OwnedSocialPublisherAgent } from "./agent";

export async function ownedSocialPublisherStub() {
  const bindings = await getCloudflareBindings();
  if (!bindings?.OWNED_SOCIAL_PUBLISHER_AGENT) return null;
  const { getAgentByName } = await import("agents");
  return getAgentByName(
    bindings.OWNED_SOCIAL_PUBLISHER_AGENT,
    "farmerbook-owned-social-publisher",
  ) as Promise<DurableObjectStub<OwnedSocialPublisherAgent>>;
}
