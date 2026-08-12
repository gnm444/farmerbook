const MAX_HTML_LENGTH = 300_000;

const entities: Record<string, string> = {
  amp: "&",
  apos: "'",
  gt: ">",
  hellip: "…",
  lt: "<",
  nbsp: " ",
  quot: '"',
};

function decodeEntities(value: string) {
  return value.replace(/&(#\d{1,7}|#x[\da-f]{1,6}|[a-z]{2,8});/gi, (match, entity: string) => {
    if (entity.startsWith("#x")) {
      const codePoint = Number.parseInt(entity.slice(2), 16);
      return Number.isSafeInteger(codePoint) && codePoint <= 0x10ffff
        ? String.fromCodePoint(codePoint)
        : match;
    }
    if (entity.startsWith("#")) {
      const codePoint = Number.parseInt(entity.slice(1), 10);
      return Number.isSafeInteger(codePoint) && codePoint <= 0x10ffff
        ? String.fromCodePoint(codePoint)
        : match;
    }
    return entities[entity.toLowerCase()] ?? match;
  });
}

export function visibleTextFromHtml(html: string, maximum = 12_000) {
  const bounded = html.slice(0, MAX_HTML_LENGTH);
  const withoutHiddenContent = bounded
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(script|style|noscript|template|svg|form|iframe)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, " ")
    .replace(/<[^>]+aria-hidden\s*=\s*["']?true["']?[^>]*>[\s\S]*?<\/[^>]+>/gi, " ");
  return decodeEntities(withoutHiddenContent.replace(/<[^>]+>/g, " "))
    .replace(/[\u200B-\u200F\u202A-\u202E\u2066-\u2069]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maximum);
}

export function firstSameOriginContactLink(html: string, baseUrl: URL) {
  const anchorPattern = /<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  for (const match of html.matchAll(anchorPattern)) {
    const label = visibleTextFromHtml(match[2] ?? "", 120).toLowerCase();
    if (!/\b(contact|enquir|business|reach us|get in touch)\b/.test(label)) continue;
    try {
      const candidate = new URL(match[1], baseUrl);
      if (candidate.origin === baseUrl.origin) return candidate.toString();
    } catch {
      continue;
    }
  }
  return null;
}
