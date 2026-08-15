import { describe, expect, it } from "vitest";
import {
  normalizeIndianPhone,
  parsePrivateFarmerContactCsv,
  privateFarmerContactSchema,
} from "@/features/farmer-database/schemas";

const base = {
  listId: "00000000-0000-4000-8000-000000000181",
  displayName: "Fictional Farmer",
  email: "FARMER@example.invalid",
  acquisitionSource: "manual_consent_import",
  sourceReference: "Signed fictional pilot consent record 42",
  state: "Andhra Pradesh",
  district: "Srikakulam",
  preferredLocale: "te-IN",
  sourceAttested: true,
  consentChannel: "email",
  consentPurpose: "farmerbook_invitation",
  consentState: "pending",
  consentTextVersion: "test-consent-2026-08-13.1",
  consentRecordedAt: "2026-08-13T01:00:00.000Z",
  idempotencyKey: "00000000-0000-4000-8000-000000000182",
} as const;

describe("private Farmer contact schemas", () => {
  it("normalizes contacts and requires evidence for active consent", () => {
    expect(privateFarmerContactSchema.parse(base).email).toBe("farmer@example.invalid");
    expect(normalizeIndianPhone("917890123456")).toBe("+917890123456");
    expect(privateFarmerContactSchema.safeParse({
      ...base,
      consentState: "active",
    }).success).toBe(false);
    expect(privateFarmerContactSchema.safeParse({
      ...base,
      consentState: "active",
      channelConfirmedAt: "2026-08-13T01:05:00.000Z",
      channelConfirmationReference: "provider-receipt-fictional",
    }).success).toBe(true);
  });

  it("rejects manual imports without consent-source attestation", () => {
    expect(privateFarmerContactSchema.safeParse({
      ...base,
      sourceAttested: false,
    }).success).toBe(false);
  });

  it("performs a bounded CSV dry run and blocks spreadsheet formulas", () => {
    const header = [
      "listId", "displayName", "email", "phone", "acquisitionSource",
      "sourceReference", "sourceAttested", "consentChannel", "consentTextVersion", "state",
      "district", "preferredLocale", "consentRecordedAt", "consentExpiresAt",
      "channelConfirmedAt", "channelConfirmationReference", "idempotencyKey",
    ].join(",");
    const row = [
      base.listId, base.displayName, base.email, "", base.acquisitionSource,
      base.sourceReference, "true", base.consentChannel, base.consentTextVersion,
      base.state, base.district, base.preferredLocale, base.consentRecordedAt,
      "", "", "",
      base.idempotencyKey,
    ].join(",");
    expect(parsePrivateFarmerContactCsv(`${header}\n${row}`)).toHaveLength(1);
    expect(() => parsePrivateFarmerContactCsv(
      `${header}\n${row.replace(base.displayName, "=IMPORTXML(test)")}`,
    )).toThrow("CSV_FORMULA_NOT_ALLOWED");
  });
});
