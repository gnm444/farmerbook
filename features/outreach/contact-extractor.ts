import type { ContactCandidate, SourceEvidence } from "./types";

const EMAIL_PATTERN = /\b[A-Z0-9._%+-]{1,64}@[A-Z0-9.-]{1,190}\.[A-Z]{2,24}\b/gi;
const PHONE_PATTERN = /(?:\+91[\s-]?)?[6-9]\d(?:[\s-]?\d){8}\b/g;
const BUSINESS_CONTEXT = /\b(business (?:enquir|inquir)|for (?:enquir|inquir)|contact(?: us)?|sales|orders?|booking|wholesale|dealer|support|call|whatsapp|email)\b/i;
const GENERIC_LOCAL_PART = /^(?:business|contact|enquir(?:y|ies)|hello|info|office|orders?|sales|support|wholesale)$/i;

function normalizedEmail(value: string) {
  return value.trim().toLowerCase();
}

function normalizedPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  const local = digits.length === 12 && digits.startsWith("91") ? digits.slice(2) : digits;
  return `+91${local}`;
}

function evidenceExcerpt(text: string, start: number, length: number) {
  const before = Math.max(0, start - 100);
  const after = Math.min(text.length, start + length + 100);
  return text.slice(before, after).replace(/\s+/g, " ").trim();
}

export function extractContactCandidates(
  text: string,
  evidence: Omit<SourceEvidence, "excerpt">,
): ContactCandidate[] {
  const candidates: ContactCandidate[] = [];
  const seen = new Set<string>();
  for (const match of text.matchAll(EMAIL_PATTERN)) {
    const raw = match[0];
    const normalizedValue = normalizedEmail(raw);
    if (seen.has(normalizedValue)) continue;
    seen.add(normalizedValue);
    const excerpt = evidenceExcerpt(text, match.index ?? 0, raw.length);
    const localPart = normalizedValue.split("@")[0] ?? "";
    const explicit = BUSINESS_CONTEXT.test(excerpt);
    candidates.push({
      channel: "email",
      value: raw,
      normalizedValue,
      evidence: { ...evidence, excerpt },
      explicitlyForBusinessEnquiries: explicit,
      needsHumanConfirmation: !explicit || !GENERIC_LOCAL_PART.test(localPart),
    });
  }
  for (const match of text.matchAll(PHONE_PATTERN)) {
    const raw = match[0];
    const normalizedValue = normalizedPhone(raw);
    if (!/^\+91[6-9]\d{9}$/.test(normalizedValue) || seen.has(normalizedValue)) continue;
    seen.add(normalizedValue);
    const excerpt = evidenceExcerpt(text, match.index ?? 0, raw.length);
    const explicit = BUSINESS_CONTEXT.test(excerpt);
    candidates.push({
      channel: "phone",
      value: raw,
      normalizedValue,
      evidence: { ...evidence, excerpt },
      explicitlyForBusinessEnquiries: explicit,
      needsHumanConfirmation: true,
    });
  }
  return candidates.slice(0, 8);
}
