import { describe, expect, it } from "vitest";
import {
  INDIA_STATES_AND_UNION_TERRITORIES,
  farmVisitRequestSchema,
} from "@/features/farm-visits/schemas";

const validRequest = {
  phone: "+919876543210",
  addressLine1: "42 Test Farm Road",
  addressLine2: "Near the test park",
  locality: "Madhapur",
  district: "Hyderabad",
  state: "Telangana",
  postalCode: "500081",
  farmingInterest: "both",
  partySize: 3,
  preferredSchedule: "weekend",
  visitorType: "individual",
  organizationName: "",
  contactRole: "",
  notes: "Interested in soil health.",
  consent: true,
  idempotencyKey: "78000000-0000-4000-8000-000000000010",
  website: "",
};

describe("Farm Visit request schema", () => {
  it("accepts a bounded Indian customer request and trims optional fields", () => {
    expect(farmVisitRequestSchema.parse({
      ...validRequest,
      addressLine2: "  Near the test park  ",
      notes: "  Interested in soil health.  ",
    })).toMatchObject({
      addressLine2: "Near the test park",
      notes: "Interested in soil health.",
      partySize: 3,
    });
    expect(INDIA_STATES_AND_UNION_TERRITORIES).toContain("Andhra Pradesh");
    expect(INDIA_STATES_AND_UNION_TERRITORIES).toContain("Telangana");
  });

  it.each([
    ["phone", { phone: "9876543210" }],
    ["PIN", { postalCode: "000001" }],
    ["party size", { partySize: 21 }],
    ["state", { state: "Not a state" }],
    ["consent", { consent: false }],
    ["school without organisation details", { visitorType: "school" }],
    ["individual with organisation details", { organizationName: "Example School", contactRole: "Teacher" }],
    ["notes", { notes: "x".repeat(501) }],
    ["control characters", { addressLine1: "42 Test\nFarm Road" }],
    ["unknown fields", { recipient: "attacker@example.com" }],
  ])("rejects an invalid %s", (_label, change) => {
    expect(farmVisitRequestSchema.safeParse({ ...validRequest, ...change }).success).toBe(false);
  });

  it("requires school and corporate requesters to identify their organisation", () => {
    expect(farmVisitRequestSchema.parse({
      ...validRequest,
      visitorType: "school",
      organizationName: "Green Valley School",
      contactRole: "Science teacher",
    })).toMatchObject({ visitorType: "school", organizationName: "Green Valley School" });
    expect(farmVisitRequestSchema.parse({
      ...validRequest,
      visitorType: "corporate",
      organizationName: "FarmerBook Foods",
      contactRole: "CSR manager",
    })).toMatchObject({ visitorType: "corporate", contactRole: "CSR manager" });
    expect(farmVisitRequestSchema.parse({
      ...validRequest,
      visitorType: "fpo",
      organizationName: "Rythu Shakti FPO",
      contactRole: "Director",
    })).toMatchObject({ visitorType: "fpo", organizationName: "Rythu Shakti FPO" });
  });
});
