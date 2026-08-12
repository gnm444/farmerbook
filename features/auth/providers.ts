import { z } from "zod";
import { getPublicSupabaseConfig } from "@/lib/env";
import type { OAuthProvider } from "./schemas";

const providerSettingsSchema = z.object({
  external: z.object({
    google: z.boolean().optional(),
    facebook: z.boolean().optional(),
  }),
});

const providerNames: Record<OAuthProvider, string> = {
  google: "Google",
  facebook: "Facebook",
};

type ProviderStatus = "enabled" | "disabled" | "unknown";

type SettingsFetcher = (
  input: string | URL,
  init?: RequestInit,
) => Promise<{ ok: boolean; json(): Promise<unknown> }>;

export function parseProviderStatus(
  value: unknown,
  provider: OAuthProvider,
): ProviderStatus {
  const parsed = providerSettingsSchema.safeParse(value);
  if (!parsed.success) {
    return "unknown";
  }

  const enabled = parsed.data.external[provider];
  return typeof enabled === "boolean"
    ? enabled
      ? "enabled"
      : "disabled"
    : "unknown";
}

export async function getOAuthProviderStatus(
  provider: OAuthProvider,
  fetcher: SettingsFetcher = fetch,
): Promise<ProviderStatus> {
  const config = getPublicSupabaseConfig();
  if (!config) {
    return "unknown";
  }

  try {
    const response = await fetcher(`${config.url}/auth/v1/settings`, {
      cache: "no-store",
      headers: { apikey: config.publishableKey },
    });
    if (!response.ok) {
      return "unknown";
    }

    return parseProviderStatus(await response.json(), provider);
  } catch {
    // The availability check is diagnostic. Supabase remains authoritative if
    // the settings endpoint is temporarily unreachable.
    return "unknown";
  }
}

export function providerUnavailableMessage(provider: OAuthProvider) {
  return `${providerNames[provider]} sign-in is not available yet. Continue with Google or email.`;
}

export function providerStartErrorMessage(provider: OAuthProvider) {
  return `${providerNames[provider]} sign-in could not be started. Please try again or continue with email.`;
}
