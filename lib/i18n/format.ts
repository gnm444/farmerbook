import { DEFAULT_LOCALE, normalizeLocale, type SupportedLocale } from "./locales";

function safeLocale(locale: unknown): SupportedLocale {
  return normalizeLocale(locale) ?? DEFAULT_LOCALE;
}

export function formatNumber(
  value: number | bigint,
  locale: unknown = DEFAULT_LOCALE,
  options?: Intl.NumberFormatOptions,
) {
  return new Intl.NumberFormat(safeLocale(locale), options).format(value);
}

export function formatCurrency(
  value: number | bigint,
  locale: unknown = DEFAULT_LOCALE,
  currency = "INR",
  options?: Omit<Intl.NumberFormatOptions, "style" | "currency">,
) {
  return new Intl.NumberFormat(safeLocale(locale), {
    style: "currency",
    currency,
    ...options,
  }).format(value);
}

export function formatDate(
  value: Date | string | number,
  locale: unknown = DEFAULT_LOCALE,
  options?: Intl.DateTimeFormatOptions,
) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) throw new RangeError("Invalid date value");
  const formatOptions: Intl.DateTimeFormatOptions = options
    ? { timeZone: "Asia/Kolkata", ...options }
    : { dateStyle: "medium", timeZone: "Asia/Kolkata" };
  return new Intl.DateTimeFormat(safeLocale(locale), formatOptions).format(date);
}

export function formatList(
  values: Iterable<string>,
  locale: unknown = DEFAULT_LOCALE,
  options?: Intl.ListFormatOptions,
) {
  return new Intl.ListFormat(safeLocale(locale), {
    style: "long",
    type: "conjunction",
    ...options,
  }).format([...values]);
}

const relativeUnits = [
  { unit: "year", milliseconds: 365 * 24 * 60 * 60 * 1000 },
  { unit: "month", milliseconds: 30 * 24 * 60 * 60 * 1000 },
  { unit: "week", milliseconds: 7 * 24 * 60 * 60 * 1000 },
  { unit: "day", milliseconds: 24 * 60 * 60 * 1000 },
  { unit: "hour", milliseconds: 60 * 60 * 1000 },
  { unit: "minute", milliseconds: 60 * 1000 },
] as const;

export function formatRelativeTime(
  value: Date | string | number,
  locale: unknown = DEFAULT_LOCALE,
  options: Intl.RelativeTimeFormatOptions & { now?: Date | string | number } = {},
) {
  const target = value instanceof Date ? value : new Date(value);
  const nowValue = options.now ?? Date.now();
  const now = nowValue instanceof Date ? nowValue : new Date(nowValue);
  if (Number.isNaN(target.getTime()) || Number.isNaN(now.getTime())) {
    throw new RangeError("Invalid relative date value");
  }

  const formatOptions = { ...options };
  delete formatOptions.now;
  const delta = target.getTime() - now.getTime();
  const absolute = Math.abs(delta);
  const selected = relativeUnits.find(({ milliseconds }) => absolute >= milliseconds);
  const formatter = new Intl.RelativeTimeFormat(safeLocale(locale), {
    numeric: "auto",
    ...formatOptions,
  });
  if (!selected) {
    return formatter.format(Math.round(delta / 1000), "second");
  }
  return formatter.format(
    Math.round(delta / selected.milliseconds),
    selected.unit,
  );
}
