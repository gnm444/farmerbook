import { z } from "zod";
import { INDIA_STATES_AND_UNION_TERRITORIES } from "@/features/farm-visits/schemas";
import { normalizeIndianPhone } from "@/lib/pledges";

export const HARI_BABU_WORKSHOP_SLUG = "hari-babu-2026";
export const HARI_BABU_WORKSHOP_CONSENT_VERSION = "hari-babu-2026-v1";
export const HARI_BABU_WORKSHOP_TURNSTILE_ACTION =
  "hari_babu_workshop_registration";
// Dec 24 2026 and Mar 24 2027, both at 00:00 India Standard Time.
export const HARI_BABU_WORKSHOP_CLOSE_AT_UTC = "2026-12-23T18:30:00.000Z";
export const HARI_BABU_WORKSHOP_PURGE_AT_UTC = "2027-03-23T18:30:00.000Z";

export function isWorkshopRegistrationClosed(now = Date.now()) {
  return now >= Date.parse(HARI_BABU_WORKSHOP_CLOSE_AT_UTC);
}

export function isWorkshopRetentionExpired(now = Date.now()) {
  return now >= Date.parse(HARI_BABU_WORKSHOP_PURGE_AT_UTC);
}

const controlCharacters = /[\u0000-\u001f\u007f]/u;
const multilineControlCharacters = /[\u0000-\u0009\u000b-\u001f\u007f]/u;

const singleLine = (minimum: number, maximum: number) =>
  z.string().trim().min(minimum).max(maximum).refine(
    (value) => !controlCharacters.test(value),
    "Use plain text without line breaks or control characters.",
  );

const optionalSingleLine = (maximum: number) => z.preprocess(
  (value) => typeof value === "string" && value.trim() === "" ? undefined : value,
  singleLine(1, maximum).optional(),
);

const optionalMultiline = (maximum: number) => z.preprocess(
  (value) => typeof value === "string" && value.trim() === "" ? undefined : value,
  z.string().trim().min(1).max(maximum).refine(
    (value) => !multilineControlCharacters.test(value),
    "Use plain text without control characters.",
  ).optional(),
);

export const workshopRegistrationInputSchema = z.strictObject({
  submissionId: z.uuid(),
  nonce: z.string().min(1).max(512),
  farmerName: singleLine(2, 120),
  phone: z.preprocess(
    (value) => typeof value === "string" && value.length <= 40
      ? normalizeIndianPhone(value) ?? value.trim()
      : value,
    z.string().max(40).regex(
      /^\+91[6-9]\d{9}$/u,
      "Use an Indian mobile number such as +919876543210.",
    ),
  ),
  district: singleLine(2, 100),
  state: z.enum(INDIA_STATES_AND_UNION_TERRITORIES),
  farmName: optionalSingleLine(160),
  farmLocation: optionalSingleLine(160),
  yearsFarming: z.number().int().min(0).max(80).optional(),
  crops: optionalSingleLine(300),
  attendanceInterest: z.enum(["attend", "interested"]),
  challenges: optionalMultiline(1000),
  proposedSolutions: optionalMultiline(1000),
  consent: z.literal(true, { error: "Consent is required." }),
  turnstileToken: z.string().min(1).max(4096),
  website: z.string().trim().max(160).optional().default(""),
});

export type WorkshopRegistrationInput = z.infer<typeof workshopRegistrationInputSchema>;

export const storedWorkshopRegistrationSchema = z.strictObject({
  farmerName: singleLine(2, 120),
  phone: z.string().regex(/^\+91[6-9]\d{9}$/u),
  district: singleLine(2, 100),
  state: z.enum(INDIA_STATES_AND_UNION_TERRITORIES),
  farmName: optionalSingleLine(160),
  farmLocation: optionalSingleLine(160),
  yearsFarming: z.number().int().min(0).max(80).optional(),
  crops: optionalSingleLine(300),
  attendanceInterest: z.enum(["attend", "interested"]),
  challenges: optionalMultiline(1000),
  proposedSolutions: optionalMultiline(1000),
});

export type StoredWorkshopRegistration = z.infer<typeof storedWorkshopRegistrationSchema>;

export function privateRegistrationFromInput(
  input: WorkshopRegistrationInput,
): StoredWorkshopRegistration {
  return storedWorkshopRegistrationSchema.parse({
    farmerName: input.farmerName,
    phone: input.phone,
    district: input.district,
    state: input.state,
    farmName: input.farmName,
    farmLocation: input.farmLocation,
    yearsFarming: input.yearsFarming,
    crops: input.crops,
    attendanceInterest: input.attendanceInterest,
    challenges: input.challenges,
    proposedSolutions: input.proposedSolutions,
  });
}
