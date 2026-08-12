const TRACKING_PARAMETERS = new Set([
  "fbclid",
  "gclid",
  "mc_cid",
  "mc_eid",
  "utm_campaign",
  "utm_content",
  "utm_medium",
  "utm_source",
  "utm_term",
]);

const blockedHostnames = new Set([
  "localhost",
  "localhost.localdomain",
  "metadata.google.internal",
  "metadata",
]);

function parseIpv4(hostname: string): number[] | null {
  if (!/^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname)) return null;
  const octets = hostname.split(".").map(Number);
  return octets.every((octet) => octet >= 0 && octet <= 255) ? octets : null;
}

function isBlockedIpv4(octets: number[]) {
  const [a, b] = octets;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 0) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224
  );
}

function isBlockedHostname(hostname: string) {
  const normalized = hostname.toLowerCase().replace(/\.$/, "");
  if (
    blockedHostnames.has(normalized) ||
    normalized.endsWith(".localhost") ||
    normalized.endsWith(".local") ||
    normalized.endsWith(".internal")
  ) {
    return true;
  }
  const ipv4 = parseIpv4(normalized);
  if (ipv4) return isBlockedIpv4(ipv4);
  if (normalized.includes(":")) {
    // Literal IPv6 sources are unnecessary for this bounded business-research
    // workflow and make private/mapped-address checks needlessly fragile.
    return true;
  }
  return false;
}

export function normalizeOutreachUrl(value: string) {
  const url = new URL(value);
  url.hash = "";
  url.hostname = url.hostname.toLowerCase().replace(/\.$/, "");
  for (const parameter of [...url.searchParams.keys()]) {
    if (TRACKING_PARAMETERS.has(parameter.toLowerCase())) {
      url.searchParams.delete(parameter);
    }
  }
  url.searchParams.sort();
  if ((url.protocol === "https:" && url.port === "443") || (url.protocol === "http:" && url.port === "80")) {
    url.port = "";
  }
  return url.toString();
}

export function validateWebsiteUrl(
  value: string,
  options: { production?: boolean; expectedOrigin?: string } = {},
) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return { ok: false as const, code: "INVALID_URL" as const };
  }
  if (url.username || url.password || url.hash) {
    return { ok: false as const, code: "BLOCKED_URL" as const };
  }
  if (url.protocol !== "https:" && (!(!options.production && url.protocol === "http:"))) {
    return { ok: false as const, code: "HTTPS_REQUIRED" as const };
  }
  if (url.port && url.port !== "443" && !(url.protocol === "http:" && url.port === "80")) {
    return { ok: false as const, code: "BLOCKED_PORT" as const };
  }
  if (isBlockedHostname(url.hostname)) {
    return { ok: false as const, code: "BLOCKED_HOST" as const };
  }
  if (options.expectedOrigin && url.origin !== options.expectedOrigin) {
    return { ok: false as const, code: "CROSS_ORIGIN_REDIRECT" as const };
  }
  return { ok: true as const, url: new URL(normalizeOutreachUrl(url.toString())) };
}
