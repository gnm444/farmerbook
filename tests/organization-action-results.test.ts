import { describe, expect, it } from "vitest";
import { databaseActionFailure } from "@/features/organizations/action-result";

describe("organization and offer database action failures", () => {
  it.each([
    ["23505", "CONFLICT"],
    ["40001", "CONFLICT"],
    ["42501", "FORBIDDEN"],
    ["P0002", "NOT_FOUND"],
    ["PGRST116", "NOT_FOUND"],
    ["22023", "INVALID_INPUT"],
    ["22007", "INVALID_INPUT"],
    ["55000", "NOT_PUBLISHABLE"],
  ])("maps database code %s to stable code %s", (databaseCode, expected) => {
    expect(databaseActionFailure({ code: databaseCode })).toMatchObject({
      ok: false,
      code: expected,
    });
  });

  it("never exposes a raw database message or detail", () => {
    const failure = databaseActionFailure({
      code: "XX000",
      message: "postgres://secret-user:secret-password@internal-db",
      detail: "service-role-key=do-not-expose",
    });

    expect(failure).toEqual({
      ok: false,
      code: "DATA_UNAVAILABLE",
      message: "The request could not be completed. Please try again.",
    });
    expect(JSON.stringify(failure)).not.toContain("secret");
  });
});
