import { z } from "zod";
import { isIndiaStateOrUnionTerritory } from "@/lib/india/regions";
import { SUPPORTED_LOCALES } from "@/lib/i18n/locales";
import { farmerContactAcquisitionSources } from "./types";

const safeText = (minimum: number, maximum: number) =>
  z.string().trim().min(minimum).max(maximum).refine(
    (value) => !/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(value),
    "Control characters are not allowed.",
  );

export function normalizeFarmerEmail(value: string) {
  return value.trim().toLocaleLowerCase("en-IN");
}

export function normalizeIndianPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  const local = digits.length === 12 && digits.startsWith("91")
    ? digits.slice(2)
    : digits;
  return `+91${local}`;
}

export const farmerContactListSchema = z.object({
  name: safeText(2, 100),
  purpose: z.enum(["farmerbook_invitation", "farmerbook_member_support"]),
  idempotencyKey: z.uuid(),
}).strict();

export const privateFarmerContactSchema = z.object({
  listId: z.uuid(),
  displayName: safeText(2, 100).optional(),
  email: z.email().max(254).transform(normalizeFarmerEmail).optional(),
  phone: z.string().trim().transform(normalizeIndianPhone).pipe(
    z.string().regex(/^\+91[6-9]\d{9}$/, "Use an Indian mobile number."),
  ).optional(),
  acquisitionSource: z.enum(farmerContactAcquisitionSources),
  sourceReference: safeText(2, 500),
  state: z.string().refine(
    isIndiaStateOrUnionTerritory,
    "Select an Indian state or union territory.",
  ),
  district: safeText(2, 100),
  preferredLocale: z.enum(SUPPORTED_LOCALES),
  sourceAttested: z.boolean(),
  consentChannel: z.enum(["email", "phone"]),
  consentPurpose: z.literal("farmerbook_invitation"),
  consentState: z.enum(["pending", "active"]).default("pending"),
  consentTextVersion: safeText(5, 100),
  consentRecordedAt: z.iso.datetime({ offset: true }),
  consentExpiresAt: z.iso.datetime({ offset: true }).optional(),
  channelConfirmedAt: z.iso.datetime({ offset: true }).optional(),
  channelConfirmationReference: safeText(8, 500).optional(),
  idempotencyKey: z.uuid(),
}).strict().superRefine((value, context) => {
  if (!value.email && !value.phone) {
    context.addIssue({
      code: "custom",
      path: ["email"],
      message: "Provide an email or Indian mobile number.",
    });
  }
  if (value.consentChannel === "email" && !value.email) {
    context.addIssue({
      code: "custom",
      path: ["email"],
      message: "Email is required for email consent.",
    });
  }
  if (value.consentChannel === "phone" && !value.phone) {
    context.addIssue({
      code: "custom",
      path: ["phone"],
      message: "Phone is required for phone consent.",
    });
  }
  if (value.acquisitionSource === "manual_consent_import" && !value.sourceAttested) {
    context.addIssue({
      code: "custom",
      path: ["sourceAttested"],
      message: "Manual imports require consent-source attestation.",
    });
  }
  if (
    value.consentState === "active" &&
    (!value.channelConfirmedAt || !value.channelConfirmationReference)
  ) {
    context.addIssue({
      code: "custom",
      path: ["channelConfirmationReference"],
      message: "Active consent requires channel-confirmation evidence.",
    });
  }
});

export const farmerContactOperationSchema = z.object({
  contactId: z.uuid(),
  operation: z.enum(["withdraw", "suppress", "privacy_delete"]),
  reason: safeText(5, 500),
  idempotencyKey: z.uuid(),
}).strict();

export const youtubeDiscoveryInputSchema = z.object({
  query: safeText(3, 200),
  locale: z.enum(SUPPORTED_LOCALES),
  idempotencyKey: z.uuid(),
}).strict();

export const csvImportSchema = z.array(privateFarmerContactSchema).min(1).max(100);

function csvCell(value: string) {
  const trimmed = value.trim();
  if (/^[=+\-@]/.test(trimmed)) throw new Error("CSV_FORMULA_NOT_ALLOWED");
  return trimmed;
}

export function parsePrivateFarmerContactCsv(text: string) {
  if (text.length > 100_000) throw new Error("CSV_TOO_LARGE");
  const lines = text.replaceAll("\r\n", "\n").split("\n").filter(Boolean);
  if (lines.length < 2 || lines.length > 101) throw new Error("CSV_ROW_COUNT_INVALID");
  const header = lines[0]!.split(",").map((value) => value.trim());
  const expected = [
    "listId", "displayName", "email", "phone", "acquisitionSource",
    "sourceReference", "sourceAttested", "consentChannel", "consentTextVersion",
    "state", "district", "preferredLocale", "consentRecordedAt",
    "consentExpiresAt", "channelConfirmedAt",
    "channelConfirmationReference", "idempotencyKey",
  ];
  if (header.join("|") !== expected.join("|")) throw new Error("CSV_HEADER_INVALID");
  const rows = lines.slice(1).map((line) => {
    const values = line.split(",").map(csvCell);
    if (values.length !== expected.length) throw new Error("CSV_COLUMN_COUNT_INVALID");
    const record = Object.fromEntries(expected.map((key, index) => [key, values[index]]));
    return {
      ...record,
      displayName: record.displayName || undefined,
      email: record.email || undefined,
      phone: record.phone || undefined,
      sourceAttested: record.sourceAttested === "true",
      consentPurpose: "farmerbook_invitation",
      consentState: record.channelConfirmedAt ? "active" : "pending",
      consentExpiresAt: record.consentExpiresAt || undefined,
      channelConfirmedAt: record.channelConfirmedAt || undefined,
      channelConfirmationReference:
        record.channelConfirmationReference || undefined,
    };
  });
  return csvImportSchema.parse(rows);
}
