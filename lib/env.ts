import { z } from "zod";

const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
});

function isLocalHostname(hostname: string) {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1" ||
    hostname.endsWith(".localhost")
  );
}

export function isDemoMode() {
  return process.env.NEXT_PUBLIC_DEMO_MODE === "true";
}

function hostnameFromRequestHost(requestHost: string | null | undefined) {
  const firstHost = requestHost?.split(",")[0]?.trim();
  if (!firstHost) return null;
  try {
    return new URL(`http://${firstHost}`).hostname;
  } catch {
    return null;
  }
}

export function isProductionSite(requestHost?: string | null) {
  const deployedHostname = hostnameFromRequestHost(requestHost);
  if (requestHost !== undefined) {
    return !deployedHostname || !isLocalHostname(deployedHostname);
  }

  const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!configuredSiteUrl) return false;

  try {
    const url = new URL(configuredSiteUrl);
    return !isLocalHostname(url.hostname);
  } catch {
    return false;
  }
}

export function assertPublicRuntimeConfiguration(options: {
  requestHost?: string | null;
} = {}) {
  if (!isProductionSite(options.requestHost)) return;

  if (isDemoMode()) {
    throw new Error(
      "FarmerBook cannot start on a production origin with NEXT_PUBLIC_DEMO_MODE=true.",
    );
  }

  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  ) {
    throw new Error(
      "FarmerBook requires NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY on a production origin.",
    );
  }
}

export function getPublicSupabaseConfig() {
  assertPublicRuntimeConfiguration();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url && !publishableKey) {
    return null;
  }

  const parsed = publicSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: url,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: publishableKey,
  });

  if (!parsed.success) {
    throw new Error(
      "FarmerBook Supabase configuration is incomplete. Set both NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.",
    );
  }

  return {
    url: parsed.data.NEXT_PUBLIC_SUPABASE_URL,
    publishableKey: parsed.data.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  };
}

export function isSupabaseConfigured() {
  assertPublicRuntimeConfiguration();
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
}

export function getSiteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}
