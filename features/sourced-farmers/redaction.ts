export const CONTACT_REDACTION_MARKER = "[contact redacted]";

const emailPattern = /\b[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9-]+(?:\.[A-Z0-9-]+)+\b/giu;
const obfuscatedEmailPattern = /\b[A-Z0-9._%+-]+\s*(?:\[at\]|\(at\)|\sat\s)\s*[A-Z0-9.-]+\s*(?:\[dot\]|\(dot\)|\sdot\s)\s*[A-Z]{2,}\b/giu;
const handlePattern = /(^|[\s(:,;])@[\p{L}\p{M}\p{N}._-]{2,100}(?![\p{L}\p{M}\p{N}._-])/gu;
const urlPattern = /\b(?:https?:\/\/|www\.)[^\s<>"'`]+/giu;
const directSchemePattern = /\b(?:mailto|tel|sms):[^\s<>"'`]+/giu;
const phoneCandidatePattern = /(?<![\p{L}\p{N}])(?:\+|00)?\d[\d \t().-]{5,}\d(?![\p{L}\p{N}])/gu;
const contactLabelPattern = /\b(?:call|contact|mobile|mob|phone|telephone|tel|whatsapp|wa|message|dm)\s*(?:us|me)?\s*(?:at|on|:|-)?\s*/giu;
const contactLabelTeluguPattern = /(?:సంప్రదించండి|సంప్రదించడానికి|వాట్సాప్|ఫోన్|మొబైల్)\s*(?:లో|కు|:|-)?\s*/gu;
const directContactHosts = [
  "wa.me",
  "whatsapp.com",
  "api.whatsapp.com",
  "t.me",
  "telegram.me",
  "signal.me",
  "m.me",
  "instagram.com",
  "facebook.com",
  "fb.me",
  "x.com",
  "twitter.com",
] as const;

function stripTrailingUrlPunctuation(value: string) {
  return value.replace(/[),.;!?]+$/u, "");
}

function isDirectContactUrl(value: string) {
  try {
    const normalized = value.startsWith("www.") ? `https://${value}` : value;
    const url = new URL(stripTrailingUrlPunctuation(normalized));
    const hostname = url.hostname.toLocaleLowerCase("en-US");
    return directContactHosts.some(
      (host) => hostname === host || hostname.endsWith(`.${host}`),
    );
  } catch {
    return false;
  }
}

function redactPhoneCandidates(value: string) {
  return value.replace(phoneCandidatePattern, (candidate) => {
    const digits = candidate.replace(/\D/gu, "");
    const hasInternationalPrefix = /^\s*(?:\+|00)/u.test(candidate);
    const compact = candidate.replace(/[\s().-]/gu, "");
    const isIndianMobile = /^(?:\+?91|0)?[6-9]\d{9}$/u.test(compact);
    const isLongPhone = digits.length >= 10 && digits.length <= 15;
    return hasInternationalPrefix || isIndianMobile || isLongPhone
      ? CONTACT_REDACTION_MARKER
      : candidate;
  });
}

function redactContactLabelValues(value: string, pattern: RegExp) {
  return value.replace(pattern, (label, offset: number, input: string) => {
    const remainder = input.slice(offset + label.length);
    if (
      /^(?:@|\+|00|\d{7,}|https?:\/\/|www\.|mailto:|tel:)/iu.test(remainder)
    ) {
      return `${label}${CONTACT_REDACTION_MARKER} `;
    }
    return label;
  });
}

function collapseMarkers(value: string) {
  const escaped = CONTACT_REDACTION_MARKER.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  return value
    .replace(new RegExp(`(?:${escaped}[\\s,;:|/-]*){2,}`, "gu"), `${CONTACT_REDACTION_MARKER} `)
    .replace(/[ \t]+\n/gu, "\n")
    .replace(/[ \t]{2,}/gu, " ")
    .trim();
}

export function redactContactInformation(input: string, maximumLength = 5_000) {
  let value = input
    .normalize("NFKC")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/gu, " ")
    .replace(obfuscatedEmailPattern, CONTACT_REDACTION_MARKER)
    .replace(emailPattern, CONTACT_REDACTION_MARKER)
    .replace(directSchemePattern, CONTACT_REDACTION_MARKER)
    .replace(urlPattern, (url) =>
      isDirectContactUrl(url) ? CONTACT_REDACTION_MARKER : url
    )
    .replace(handlePattern, (_match, prefix: string) =>
      `${prefix}${CONTACT_REDACTION_MARKER}`
    );
  value = redactPhoneCandidates(value);
  value = redactContactLabelValues(value, contactLabelPattern);
  value = redactContactLabelValues(value, contactLabelTeluguPattern);
  return collapseMarkers(value).slice(0, Math.max(0, maximumLength));
}

export function containsContactInformation(input: string) {
  const matches = (pattern: RegExp) => {
    pattern.lastIndex = 0;
    const found = pattern.test(input);
    pattern.lastIndex = 0;
    return found;
  };
  if (matches(emailPattern) || matches(obfuscatedEmailPattern)) return true;
  if (matches(directSchemePattern)) return true;
  if (matches(handlePattern)) return true;
  for (const match of input.matchAll(urlPattern)) {
    if (isDirectContactUrl(match[0])) return true;
  }
  for (const match of input.matchAll(phoneCandidatePattern)) {
    const candidate = match[0];
    const digits = candidate.replace(/\D/gu, "");
    const compact = candidate.replace(/[\s().-]/gu, "");
    if (
      /^\s*(?:\+|00)/u.test(candidate) ||
      /^(?:\+?91|0)?[6-9]\d{9}$/u.test(compact) ||
      (digits.length >= 10 && digits.length <= 15)
    ) return true;
  }
  return false;
}
