import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  flags: new Map<string, boolean>(),
  requireAdmin: vi.fn(),
  rpc: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/lib/feature-flags", () => ({
  isFeatureEnabled: (name: string) => mocks.flags.get(name) ?? false,
}));
vi.mock("@/lib/env", () => ({
  isDemoMode: () => false,
  isSupabaseConfigured: () => true,
}));
vi.mock("@/features/auth/require-admin", () => ({
  requireAdmin: mocks.requireAdmin,
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ rpc: mocks.rpc })),
}));

import { reviewAiCompanyProposalAction } from "@/features/company-agents/actions";

const input = {
  proposalId: "00000000-0000-4000-8000-000000001030",
  decision: "approved",
  expectedRevision: 0,
  reason: "Reviewed against aggregate evidence.",
  idempotencyKey: "00000000-0000-4000-8000-000000001031",
} as const;

describe("AI company proposal review action", () => {
  beforeEach(() => {
    mocks.flags.clear();
    mocks.flags.set("ENABLE_MANAGED_OPERATIONS_AGENTS", true);
    mocks.flags.set("ENABLE_AI_COMPANY", true);
    mocks.requireAdmin.mockReset();
    mocks.requireAdmin.mockResolvedValue({ id: "admin", demo: false });
    mocks.rpc.mockReset();
    mocks.rpc.mockResolvedValue({ data: [{ code: "APPROVED" }], error: null });
    mocks.revalidatePath.mockReset();
  });

  it("requires both application gates before authentication", async () => {
    mocks.flags.set("ENABLE_AI_COMPANY", false);
    await expect(reviewAiCompanyProposalAction(input)).resolves.toMatchObject({
      ok: false,
    });
    expect(mocks.requireAdmin).not.toHaveBeenCalled();
  });

  it("records a backlog decision without claiming execution", async () => {
    await expect(reviewAiCompanyProposalAction(input)).resolves.toEqual({
      ok: true,
      message: "Decision recorded in the operating backlog. No external action was executed.",
    });
    expect(mocks.rpc).toHaveBeenCalledWith("review_ai_company_proposal", {
      proposal_id_input: input.proposalId,
      decision_input: "approved",
      expected_revision_input: 0,
      reason_input: input.reason,
      idempotency_key_input: input.idempotencyKey,
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/admin/agents");
  });
});
