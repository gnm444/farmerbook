import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  demoMode: false,
  rpc: vi.fn(),
  verifyTurnstile: vi.fn(),
}));

vi.mock("@/lib/env", () => ({
  isDemoMode: () => mocks.demoMode,
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ rpc: mocks.rpc }),
}));
vi.mock("@/features/outreach/turnstile", () => ({
  verifyTurnstileToken: mocks.verifyTurnstile,
}));

import { GET, POST } from "@/app/api/pledges/route";
import {
  isHoneypotFilled,
  normalizeIndianPhone,
  pledgeInputSchema,
  publicPledge,
} from "@/lib/pledges";

const validPledge = {
  name: "Ananya Rao",
  phone: "91779 01022",
  locality: "Srikakulam",
  organization: "Community group",
  show_public_name: true,
  consent: true,
  website: "",
  turnstileToken: "verified-token",
};

function pledgeRequest(
  body: string | object,
  headers: Record<string, string> = {},
) {
  return new Request("https://farmerbook.in/api/pledges", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: "https://farmerbook.in",
      "sec-fetch-site": "same-origin",
      ...headers,
    },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.demoMode = false;
  mocks.verifyTurnstile.mockResolvedValue(true);
  mocks.rpc.mockResolvedValue({ data: null, error: null });
  vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", "site-key");
  vi.stubEnv("TURNSTILE_SECRET_KEY", "turnstile-secret");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("plate pledge validation", () => {
  it("normalizes supported Indian mobile formats and rejects other numbers", () => {
    expect(normalizeIndianPhone("91779 01022")).toBe("+919177901022");
    expect(normalizeIndianPhone("09177901022")).toBe("+919177901022");
    expect(normalizeIndianPhone("+91-91779-01022")).toBe("+919177901022");
    expect(normalizeIndianPhone("+1 415 555 2671")).toBeNull();
  });

  it("uses a strict consent schema and detects both honeypot fields", () => {
    expect(pledgeInputSchema.safeParse(validPledge).success).toBe(true);
    expect(pledgeInputSchema.safeParse({ ...validPledge, extra: true }).success)
      .toBe(false);
    expect(isHoneypotFilled({ website: "spam.example", honeypot: "" }))
      .toBe(true);
    expect(isHoneypotFilled({ website: "", honeypot: "" })).toBe(false);
  });

  it("projects only consented public fields", () => {
    expect(publicPledge({
      display_name: "Ananya Rao",
      created_at: "2026-09-20T00:00:00.000Z",
    })).toEqual({
      name: "Ananya Rao",
      createdAt: "2026-09-20T00:00:00.000Z",
    });
  });
});

describe("plate pledge API", () => {
  it("rejects cross-origin and non-JSON submissions before storage", async () => {
    const crossOrigin = await POST(pledgeRequest(validPledge, {
      origin: "https://attacker.example",
      "sec-fetch-site": "cross-site",
    }));
    expect(crossOrigin.status).toBe(403);

    const wrongType = await POST(pledgeRequest(validPledge, {
      "content-type": "text/plain",
    }));
    expect(wrongType.status).toBe(415);
    expect(mocks.verifyTurnstile).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("caps streamed bodies even when Content-Length is absent", async () => {
    const response = await POST(pledgeRequest(`{"padding":"${"x".repeat(17_000)}"}`));
    expect(response.status).toBe(413);
    await expect(response.json()).resolves.toMatchObject({
      code: "REQUEST_TOO_LARGE",
    });
    expect(mocks.verifyTurnstile).not.toHaveBeenCalled();
  });

  it("silently ignores the honeypot without verification or storage", async () => {
    const response = await POST(pledgeRequest({
      ...validPledge,
      website: "spam.example",
      turnstileToken: "",
    }));
    expect(response.status).toBe(202);
    expect(mocks.verifyTurnstile).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("fails closed when protection is missing or the token is rejected", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", "");
    const unconfigured = await POST(pledgeRequest(validPledge));
    expect(unconfigured.status).toBe(503);

    vi.stubEnv("TURNSTILE_SECRET_KEY", "turnstile-secret");
    mocks.verifyTurnstile.mockResolvedValue(false);
    const rejected = await POST(pledgeRequest(validPledge));
    expect(rejected.status).toBe(403);
    await expect(rejected.json()).resolves.toMatchObject({
      code: "TURNSTILE_FAILED",
    });
  });

  it("stores a canonical private phone only after Turnstile verification", async () => {
    const response = await POST(pledgeRequest(validPledge, {
      "cf-connecting-ip": "203.0.113.8",
    }));
    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({ code: "PLEDGE_RECORDED" });
    expect(mocks.verifyTurnstile).toHaveBeenCalledWith(
      "verified-token",
      expect.objectContaining({
        remoteIp: "203.0.113.8",
        expectedHostname: "farmerbook.in",
        expectedAction: "plate_pledge",
      }),
    );
    expect(mocks.rpc).toHaveBeenCalledWith("submit_plate_pledge", {
      display_name_input: "Ananya Rao",
      phone_number_input: "+919177901022",
      locality_input: "Srikakulam",
      organization_input: "Community group",
      show_public_name_input: true,
    });
  });

  it("returns a specific conflict for a phone that already pledged", async () => {
    mocks.rpc.mockResolvedValue({
      data: null,
      error: { code: "23505", message: "unique violation" },
    });
    const response = await POST(pledgeRequest(validPledge));
    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      code: "PLEDGE_ALREADY_RECORDED",
    });
  });

  it("fails without claiming success when storage is unavailable", async () => {
    mocks.rpc.mockResolvedValue({
      data: null,
      error: { code: "XX000", message: "storage unavailable" },
    });
    const response = await POST(pledgeRequest(validPledge));
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      code: "PLEDGE_STORAGE_UNAVAILABLE",
    });
  });

  it("returns only public names and timestamps", async () => {
    mocks.rpc.mockResolvedValue({
      data: [
        {
          display_name: "Ananya Rao",
          created_at: "2026-09-20T00:00:00.000Z",
          phone_number: "+919177901022",
        },
        { display_name: "Incomplete row" },
      ],
      error: null,
    });
    const response = await GET();
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({
      pledges: [{
        name: "Ananya Rao",
        createdAt: "2026-09-20T00:00:00.000Z",
      }],
      count: 1,
    });
    expect(JSON.stringify(body)).not.toContain("9177901022");
  });
});

describe("plate pledge database boundary", () => {
  it("forces RLS, limits RPC execution and enforces one canonical phone", () => {
    const sql = readFileSync(
      "supabase/migrations/20260919130000_plate_pledges.sql",
      "utf8",
    );
    expect(sql).toContain("alter table public.plate_pledges force row level security");
    expect(sql).toContain("revoke all on table public.plate_pledges from public, anon, authenticated");
    expect(sql).toContain("plate_pledges_phone_number_unique_idx");
    expect(sql).toContain("phone_number ~ '^[+]91[6-9][0-9]{9}$'");
    expect(sql).toContain("if coalesce((select auth.role()), '') <> 'service_role'");
  });

  it("never presents a storage failure as a demo confirmation", () => {
    const client = readFileSync("app/pledge/pledge-page.tsx", "utf8");
    expect(client).not.toContain("demo confirmation");
    expect(client).toContain("We could not save your pledge");
  });
});
