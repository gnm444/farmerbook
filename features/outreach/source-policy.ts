import type { OutreachSourceType } from "./types";

const providerHosts: ReadonlyArray<{
  type: OutreachSourceType;
  hosts: readonly string[];
}> = [
  { type: "youtube", hosts: ["youtube.com", "youtu.be"] },
  { type: "instagram", hosts: ["instagram.com"] },
  { type: "facebook", hosts: ["facebook.com", "fb.com", "fb.watch"] },
  { type: "linkedin", hosts: ["linkedin.com"] },
  {
    type: "other_social",
    hosts: ["x.com", "twitter.com", "threads.net", "tiktok.com"],
  },
];

function hostMatches(hostname: string, allowed: string) {
  return hostname === allowed || hostname.endsWith(`.${allowed}`);
}

export function classifyOutreachSource(value: string): OutreachSourceType {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return "unsupported";
    const hostname = url.hostname.toLowerCase().replace(/\.$/, "");
    for (const provider of providerHosts) {
      if (provider.hosts.some((host) => hostMatches(hostname, host))) {
        return provider.type;
      }
    }
    return "website";
  } catch {
    return "unsupported";
  }
}

export function sourceMayBeFetched(sourceType: OutreachSourceType) {
  return sourceType === "website";
}

export function requiresOperatorEvidence(sourceType: OutreachSourceType) {
  return sourceType !== "website" && sourceType !== "unsupported";
}
