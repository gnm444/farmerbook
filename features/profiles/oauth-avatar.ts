import type { User } from "@supabase/supabase-js";

const providerAvatarHosts: Record<string, string[]> = {
  google: ["googleusercontent.com", "ggpht.com"],
  facebook: ["facebook.com", "fbcdn.net", "fbsbx.com"],
  linkedin: ["licdn.com", "linkedin.com"],
  linkedin_oidc: ["licdn.com", "linkedin.com"],
  instagram: ["cdninstagram.com", "fbcdn.net"],
};

export type TrustedOAuthAvatar = {
  provider: string;
  url: string;
};

function hostnameAllowed(hostname: string, allowed: string[]) {
  const normalized = hostname.toLowerCase();
  return allowed.some(
    (domain) => normalized === domain || normalized.endsWith(`.${domain}`),
  );
}

export function isTrustedOAuthAvatarUrl(provider: string, value: unknown) {
  if (typeof value !== "string" || value.length > 2_000) return false;
  const allowed = providerAvatarHosts[provider];
  if (!allowed) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && hostnameAllowed(url.hostname, allowed);
  } catch {
    return false;
  }
}

function candidateFrom(
  provider: string,
  metadata: Record<string, unknown> | undefined,
): TrustedOAuthAvatar | undefined {
  for (const value of [metadata?.avatar_url, metadata?.picture]) {
    if (isTrustedOAuthAvatarUrl(provider, value)) {
      return { provider, url: value as string };
    }
  }
  return undefined;
}

export function trustedOAuthAvatarForUser(
  user: Pick<User, "app_metadata" | "identities" | "user_metadata">,
): TrustedOAuthAvatar | undefined {
  for (const identity of user.identities ?? []) {
    const candidate = candidateFrom(
      identity.provider,
      identity.identity_data as Record<string, unknown> | undefined,
    );
    if (candidate) return candidate;
  }

  const provider =
    typeof user.app_metadata.provider === "string"
      ? user.app_metadata.provider
      : undefined;
  return provider
    ? candidateFrom(provider, user.user_metadata as Record<string, unknown>)
    : undefined;
}
