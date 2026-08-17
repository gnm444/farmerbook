export function aiText(value: unknown) {
  if (!value || typeof value !== "object") return null;
  const record = value as {
    response?: unknown;
    choices?: Array<{
      message?: { content?: unknown };
      text?: unknown;
    }>;
  };
  const response = typeof record.response === "string"
    ? record.response
    : typeof record.choices?.[0]?.message?.content === "string"
      ? record.choices[0].message.content
      : typeof record.choices?.[0]?.text === "string"
        ? record.choices[0].text
        : null;
  if (!response) return null;
  const text = response.replace(/\s+/g, " ").trim().slice(0, 650);
  if (!text || /(?:password|payment credentials|send me your|guaranteed|certified organic status confirmed)/i.test(text)) {
    return null;
  }
  return text;
}
