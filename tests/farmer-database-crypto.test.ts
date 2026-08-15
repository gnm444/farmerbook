import { describe, expect, it } from "vitest";
import {
  decryptPrivateContactValue,
  encryptPrivateContactValue,
  privateContactValueHash,
  privateFarmerContactConfiguration,
} from "@/features/farmer-database/crypto";

const secret = "private-farmer-contact-test-key-".repeat(2);

describe("private Farmer contact encryption", () => {
  it("encrypts with a fresh IV and decrypts only in the matching field context", async () => {
    const first = await encryptPrivateContactValue("farmer@example.invalid", "email", secret);
    const second = await encryptPrivateContactValue("farmer@example.invalid", "email", secret);
    expect(first).toMatch(/^v1\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
    expect(second).not.toBe(first);
    expect(first).not.toContain("farmer@example.invalid");
    await expect(decryptPrivateContactValue(first, "email", secret)).resolves.toBe(
      "farmer@example.invalid",
    );
    await expect(
      decryptPrivateContactValue(first, "phone", secret),
    ).rejects.toThrow("PRIVATE_CONTACT_DECRYPTION_FAILED");
  });

  it("creates stable keyed duplicate hashes without exposing the value", async () => {
    const first = await privateContactValueHash("farmer@example.invalid", "email", secret);
    const second = await privateContactValueHash("farmer@example.invalid", "email", secret);
    const phoneContext = await privateContactValueHash("farmer@example.invalid", "phone", secret);
    expect(first).toMatch(/^[0-9a-f]{64}$/);
    expect(first).toBe(second);
    expect(first).not.toBe(phoneContext);
    expect(first).not.toContain("farmer");
  });

  it("requires both the owner UUID and encryption secret", () => {
    expect(privateFarmerContactConfiguration({}).configured).toBe(false);
    expect(privateFarmerContactConfiguration({
      FARMER_CONTACT_OWNER_ID: "00000000-0000-4000-8000-000000000018",
      FARMER_CONTACT_ENCRYPTION_KEY: secret,
    }).configured).toBe(true);
  });
});
