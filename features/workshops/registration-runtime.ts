import { getCloudflareBindings } from "@/lib/cloudflare-bindings";
import type { WorkshopRegistrationAgent } from "./registration-agent";
import { HARI_BABU_WORKSHOP_SLUG } from "./registration-contracts";

export async function workshopRegistrationRuntime() {
  const bindings = await getCloudflareBindings();
  const namespace = bindings?.WORKSHOP_REGISTRATION_AGENT;
  const secret = bindings?.WORKSHOP_REGISTRATION_SECRET
    ?? process.env.WORKSHOP_REGISTRATION_SECRET;
  if (!namespace || !secret || secret.trim().length < 32) return null;
  const { getAgentByName } = await import("agents");
  const agent = await getAgentByName(
    namespace,
    HARI_BABU_WORKSHOP_SLUG,
  ) as DurableObjectStub<WorkshopRegistrationAgent>;
  return { agent, secret };
}

export function workshopTurnstileConfigured() {
  return Boolean(
    (process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "").length >= 3
    && (process.env.TURNSTILE_SECRET_KEY ?? "").length >= 8,
  );
}
