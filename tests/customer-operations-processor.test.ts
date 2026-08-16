import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  table: "",
  rpc: vi.fn(),
  from: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: mocks.from, rpc: mocks.rpc }),
}));

vi.mock("@/lib/cloudflare-bindings", () => ({
  getCloudflareBindings: vi.fn(async () => null),
}));

import {
  runCustomerSupport,
  runSocialContent,
} from "@/features/managed-agents/processor";

function queryFor(data: unknown[]) {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    gt: vi.fn(() => query),
    order: vi.fn(() => query),
    limit: vi.fn(async () => ({ data, error: null })),
  };
  return query;
}

describe("supervised customer operations processors", () => {
  beforeEach(() => {
    mocks.rpc.mockReset();
    mocks.from.mockReset();
    mocks.rpc.mockImplementation(async (name: string) =>
      name === "is_ecosystem_release_enabled"
        ? { data: true, error: null }
        : { data: [{ code: "RECORDED" }], error: null },
    );
  });

  it("creates a pending support proposal without sending a reply", async () => {
    mocks.from.mockReturnValue(queryFor([{
      id: "00000000-0000-4000-8000-000000000811",
      participant_id: "00000000-0000-4000-8000-000000000812",
      category: "technical",
      locale: "en-IN",
      subject: "Profile save problem",
      question: "My profile save button does not complete. What should I check?",
      state: "open",
      created_at: "2026-08-16T00:00:00.000Z",
      updated_at: "2026-08-16T00:00:00.000Z",
    }]));

    const result = await runCustomerSupport(
      "00000000-0000-4000-8000-000000000813",
      10,
    );
    expect(result).toMatchObject({ claimed: 1, succeeded: 1, failed: 0 });
    expect(result.summary).toMatchObject({ repliesSent: 0 });
    expect(mocks.rpc).toHaveBeenCalledWith(
      "record_agent_action_proposal",
      expect.objectContaining({ action_type_input: "support_reply" }),
    );
  });

  it("creates copy-review social content without publishing or messaging", async () => {
    mocks.from.mockReturnValue(queryFor([{
      id: "00000000-0000-4000-8000-000000000814",
      platform: "linkedin",
      locale: "en-IN",
      audience: "Farmers and agriculture buyers in India",
      objective: "Invite people to create a FarmerBook professional profile.",
      source_facts: "FarmerBook supports professional profiles and direct marketplace enquiries.",
      call_to_action: "Visit FarmerBook to learn more.",
      state: "draft",
      revision: 0,
      created_at: "2026-08-16T00:00:00.000Z",
      updated_at: "2026-08-16T00:00:00.000Z",
    }]));

    const result = await runSocialContent(
      "00000000-0000-4000-8000-000000000815",
      5,
    );
    expect(result).toMatchObject({ claimed: 1, succeeded: 1, failed: 0 });
    expect(result.summary).toMatchObject({
      postsPublished: 0,
      directMessagesSent: 0,
    });
    expect(mocks.rpc).toHaveBeenCalledWith(
      "record_agent_action_proposal",
      expect.objectContaining({ action_type_input: "social_post" }),
    );
  });

  it("fails closed when the database release control is disabled", async () => {
    mocks.rpc.mockResolvedValueOnce({ data: false, error: null });
    await expect(runCustomerSupport(
      "00000000-0000-4000-8000-000000000816",
      10,
    )).rejects.toThrow("FEATURE_DISABLED");
    expect(mocks.from).not.toHaveBeenCalled();
  });
});
