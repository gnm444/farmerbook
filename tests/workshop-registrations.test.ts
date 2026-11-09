import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  register: vi.fn(),
  list: vi.fn(),
  runtime: vi.fn(),
  verifyTurnstile: vi.fn(),
  getUser: vi.fn(),
}));

vi.mock("@/features/workshops/registration-runtime", () => ({
  workshopRegistrationRuntime: mocks.runtime,
  workshopTurnstileConfigured: () => Boolean(
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
    && process.env.TURNSTILE_SECRET_KEY,
  ),
}));
vi.mock("@/features/outreach/turnstile", () => ({
  verifyTurnstileToken: mocks.verifyTurnstile,
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getUser: mocks.getUser } }),
}));

import {
  GET as issueNonce,
  POST as register,
} from "@/app/api/workshops/hari-babu-2026/registrations/route";
import { GET as listRegistrations } from "@/app/api/admin/workshops/hari-babu-2026/registrations/route";
import {
  createWorkshopNonce,
  decryptWorkshopRegistration,
  encryptWorkshopRegistration,
  verifyWorkshopNonce,
  workshopValueHash,
} from "@/features/workshops/registration-crypto";
import { workshopRegistrationInputSchema } from "@/features/workshops/registration-contracts";
import { isPublicPath } from "@/proxy";
import robots from "@/app/robots";
import sitemap from "@/app/sitemap";

const secret = "workshop-secret-for-tests-with-32-or-more-characters";
const submissionId = "2f50ce54-fef5-4cdd-a674-d29f141307da";
const person = {
  farmerName: "Ananya Rao",
  phone: "+919876543210",
  district: "Srikakulam",
  state: "Andhra Pradesh" as const,
  farmName: "Ananya Farm",
  farmLocation: "Village road",
  yearsFarming: 12,
  crops: "Millets and pulses",
  attendanceInterest: "attend" as const,
  challenges: "Water management",
  proposedSolutions: "Mulching",
};

async function validBody() {
  return {
    submissionId,
    nonce: await createWorkshopNonce(submissionId, secret),
    ...person,
    consent: true,
    turnstileToken: "verified-token",
    website: "",
  };
}

function registrationRequest(body: unknown, headers: Record<string, string> = {}) {
  return new Request("https://farmerbook.in/api/workshops/hari-babu-2026/registrations", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: "https://farmerbook.in",
      "sec-fetch-site": "same-origin",
      "cf-connecting-ip": "203.0.113.9",
      ...headers,
    },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("ENABLE_HARI_BABU_WORKSHOP", "true");
  vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", "site-key");
  vi.stubEnv("TURNSTILE_SECRET_KEY", "turnstile-secret");
  vi.stubEnv("NEXT_PUBLIC_DEMO_MODE", "false");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "test-key");
  mocks.runtime.mockResolvedValue({
    agent: { register: mocks.register, list: mocks.list },
    secret,
  });
  mocks.register.mockResolvedValue({ status: "registered" });
  mocks.verifyTurnstile.mockResolvedValue(true);
  mocks.getUser.mockResolvedValue({
    data: { user: { id: "admin-id", app_metadata: { role: "admin" } } },
    error: null,
  });
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("workshop registration contracts and privacy", () => {
  it("accepts only bounded event fields and an Indian mobile number", async () => {
    const valid = await validBody();
    expect(workshopRegistrationInputSchema.safeParse(valid).success).toBe(true);
    for (const phone of ["9876543210", "919876543210", "+919876543210", "+91 98765-43210", "09876543210"]) {
      expect(workshopRegistrationInputSchema.parse({ ...valid, phone }).phone)
        .toBe("+919876543210");
    }
    expect(workshopRegistrationInputSchema.safeParse({ ...valid, extra: "x" }).success).toBe(false);
    expect(workshopRegistrationInputSchema.safeParse({ ...valid, phone: "+14155552671" }).success).toBe(false);
    expect(workshopRegistrationInputSchema.safeParse({ ...valid, consent: false }).success).toBe(false);
    expect(workshopRegistrationInputSchema.safeParse({ ...valid, yearsFarming: 81 }).success).toBe(false);
  });

  it("binds a signed nonce to the submission and expiry", async () => {
    const issuedAt = Date.UTC(2026, 10, 9);
    const nonce = await createWorkshopNonce(submissionId, secret, issuedAt);
    await expect(verifyWorkshopNonce(nonce, submissionId, secret, issuedAt + 1000)).resolves.toBe(true);
    await expect(verifyWorkshopNonce(nonce, crypto.randomUUID(), secret, issuedAt + 1000)).resolves.toBe(false);
    await expect(verifyWorkshopNonce(nonce, submissionId, secret, issuedAt + 31 * 60_000)).resolves.toBe(false);
    await expect(verifyWorkshopNonce(`${nonce}x`, submissionId, secret, issuedAt + 1000)).resolves.toBe(false);
  });

  it("encrypts the private record and hashes phone separately from IP", async () => {
    const envelope = await encryptWorkshopRegistration(person, secret);
    expect(envelope).not.toContain(person.phone);
    expect(envelope).not.toContain(person.farmerName);
    await expect(decryptWorkshopRegistration(envelope, secret)).resolves.toEqual(person);
    await expect(decryptWorkshopRegistration(`${envelope}x`, secret)).rejects.toThrow();
    expect(await workshopValueHash(person.phone, "phone", secret))
      .not.toBe(await workshopValueHash(person.phone, "ip", secret));
  });
});

describe("public workshop registration API", () => {
  it("exposes only event routes publicly and indexes the page only when enabled", async () => {
    expect(isPublicPath("/workshops/hari-babu-2026")).toBe(true);
    expect(isPublicPath("/api/workshops/hari-babu-2026/registrations")).toBe(true);
    expect(isPublicPath("/api/admin/workshops/hari-babu-2026/registrations")).toBe(false);
    expect((await sitemap()).map((entry) => new URL(entry.url).pathname))
      .toContain("/workshops/hari-babu-2026");
    expect(robots().rules).toMatchObject({
      disallow: expect.arrayContaining(["/api/admin/"]),
    });
    vi.stubEnv("ENABLE_HARI_BABU_WORKSHOP", "false");
    expect((await sitemap()).map((entry) => new URL(entry.url).pathname))
      .not.toContain("/workshops/hari-babu-2026");
  });

  it("issues a private, bounded form nonce only when enabled", async () => {
    const response = await issueNonce();
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    const payload = await response.json() as { submissionId: string; nonce: string };
    await expect(verifyWorkshopNonce(payload.nonce, payload.submissionId, secret)).resolves.toBe(true);

    vi.stubEnv("ENABLE_HARI_BABU_WORKSHOP", "false");
    expect((await issueNonce()).status).toBe(404);
  });

  it("rejects cross-origin, oversized, unverified, and expired submissions", async () => {
    const valid = await validBody();
    expect((await register(registrationRequest(valid, { origin: "https://other.example" }))).status).toBe(403);
    expect((await register(registrationRequest(`{"filler":"${"a".repeat(17_000)}"}`))).status).toBe(413);
    expect((await register(registrationRequest({ ...valid, nonce: "bad" }))).status).toBe(403);
    mocks.verifyTurnstile.mockResolvedValueOnce(false);
    expect((await register(registrationRequest(valid))).status).toBe(403);
    expect(mocks.register).not.toHaveBeenCalled();
  });

  it("persists encrypted data and returns no private fields", async () => {
    const response = await register(registrationRequest({
      ...await validBody(),
      phone: "98765-43210",
    }));
    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({ status: "registered" });
    expect(mocks.verifyTurnstile).toHaveBeenCalledWith("verified-token", expect.objectContaining({
      expectedAction: "hari_babu_workshop_registration",
      expectedHostname: "farmerbook.in",
    }));
    const write = mocks.register.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(write.encryptedPayload).not.toContain(person.phone);
    expect(write.encryptedPayload).not.toContain(person.farmerName);
    expect(write).not.toHaveProperty("phone");
    expect(write).not.toHaveProperty("farmerName");
    expect(write.phoneHash).toBe(await workshopValueHash("+919876543210", "phone", secret));
  });

  it("gives identical public success for new and duplicate phones, then enforces rate limits", async () => {
    const created = await register(registrationRequest(await validBody()));
    mocks.register.mockResolvedValueOnce({ status: "already_registered" });
    const duplicate = await register(registrationRequest(await validBody()));
    expect(duplicate.status).toBe(created.status);
    await expect(duplicate.json()).resolves.toEqual(await created.json());
    expect(duplicate.status).toBe(201);
    expect(duplicate.headers.get("cache-control")).toBe(created.headers.get("cache-control"));
    mocks.register.mockResolvedValueOnce({ status: "rate_limited" });
    expect((await register(registrationRequest(await validBody()))).status).toBe(429);
  });

  it("silently ignores the honeypot without changing the public success shape", async () => {
    const response = await register(registrationRequest({
      ...await validBody(),
      website: "https://spam.example",
    }));
    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({ status: "registered" });
    expect(mocks.verifyTurnstile).not.toHaveBeenCalled();
    expect(mocks.register).not.toHaveBeenCalled();
  });

  it("fails closed when protection or storage is unavailable", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", "");
    expect((await issueNonce()).status).toBe(503);
    expect((await register(registrationRequest(await validBody()))).status).toBe(503);
    expect(mocks.register).not.toHaveBeenCalled();
    vi.stubEnv("TURNSTILE_SECRET_KEY", "turnstile-secret");
    mocks.runtime.mockResolvedValueOnce(null);
    expect((await register(registrationRequest(await validBody()))).status).toBe(503);
    expect(mocks.register).not.toHaveBeenCalled();
  });
});

describe("private workshop roster API", () => {
  it("rejects demo access and users without an actual admin role", async () => {
    vi.stubEnv("NEXT_PUBLIC_DEMO_MODE", "true");
    expect((await listRegistrations(new Request("https://farmerbook.in/api/admin/workshops/hari-babu-2026/registrations"))).status).toBe(503);
    vi.stubEnv("NEXT_PUBLIC_DEMO_MODE", "false");
    mocks.getUser.mockResolvedValueOnce({
      data: { user: { id: "member-id", app_metadata: { role: "member" } } },
      error: null,
    });
    expect((await listRegistrations(new Request("https://farmerbook.in/api/admin/workshops/hari-babu-2026/registrations"))).status).toBe(403);
    expect(mocks.list).not.toHaveBeenCalled();
  });

  it("returns decrypted records only to a real admin with no-store headers", async () => {
    mocks.list.mockResolvedValue({
      count: 1,
      rows: [{
        submission_id: submissionId,
        encrypted_payload: await encryptWorkshopRegistration(person, secret),
        created_at: "2026-11-09T00:00:00.000Z",
        consent_version: "hari-babu-2026-v1",
      }],
    });
    const response = await listRegistrations(new Request(
      "https://farmerbook.in/api/admin/workshops/hari-babu-2026/registrations?limit=1",
    ));
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(response.headers.get("x-robots-tag")).toContain("noindex");
    await expect(response.json()).resolves.toMatchObject({
      count: 1,
      registrations: [{ farmerName: person.farmerName, phone: person.phone }],
    });
  });
});
