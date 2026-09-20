import { z } from "zod";

const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001f\u007f]/u;

function singleLine(minimum: number, maximum: number) {
  return z
    .string()
    .trim()
    .min(minimum)
    .max(maximum)
    .refine(
      (value) => !CONTROL_CHARACTER_PATTERN.test(value),
      "Use plain text without control characters.",
    );
}

function optionalSingleLine(maximum: number) {
  return z.preprocess(
    (value) =>
      typeof value === "string" && value.trim() === "" ? undefined : value,
    singleLine(1, maximum).optional(),
  );
}

export const pledgeInputSchema = z.strictObject({
  name: singleLine(2, 120),
  phone: z.string().trim().min(1).max(32),
  locality: optionalSingleLine(120),
  organization: optionalSingleLine(160),
  show_public_name: z.boolean(),
  consent: z.literal(true, { error: "Consent is required." }),
  website: z.string().trim().max(160).optional().default(""),
  honeypot: z.string().trim().max(160).optional().default(""),
  turnstileToken: z.string().trim().max(4096).optional().default(""),
});

export type PledgeInput = z.infer<typeof pledgeInputSchema>;

/** Return the canonical Indian mobile format used by FarmerBook tables. */
export function normalizeIndianPhone(value: string) {
  const compact = value.replace(/[\s().-]+/gu, "");
  const digits = compact.startsWith("+") ? compact.slice(1) : compact;

  if (/^[6-9]\d{9}$/u.test(digits)) {
    return `+91${digits}`;
  }

  if (/^0[6-9]\d{9}$/u.test(digits)) {
    return `+91${digits.slice(1)}`;
  }

  if (!/^91[6-9]\d{9}$/u.test(digits)) {
    return null;
  }

  return `+${digits}`;
}

export function isHoneypotFilled(input: Pick<PledgeInput, "website" | "honeypot">) {
  return input.website.trim() !== "" || input.honeypot.trim() !== "";
}

export function publicPledge(row: {
  display_name: string;
  created_at: string;
}) {
  return {
    name: row.display_name,
    createdAt: row.created_at,
  };
}
