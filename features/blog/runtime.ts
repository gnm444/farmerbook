import { getCloudflareBindings } from "@/lib/cloudflare-bindings";
import type { BlogWritingAgent } from "./agent";

export async function blogWritingAgentStub() {
  const bindings = await getCloudflareBindings();
  if (!bindings?.BLOG_WRITING_AGENT) return null;
  const { getAgentByName } = await import("agents");
  return getAgentByName(
    bindings.BLOG_WRITING_AGENT,
    "farmerbook-blog-writing",
  ) as Promise<DurableObjectStub<BlogWritingAgent>>;
}
