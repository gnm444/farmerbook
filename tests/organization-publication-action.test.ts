import { afterEach, describe, expect, it, vi } from "vitest";

const input = {
  organizationId: "2cb71437-cdf0-4551-a853-2617c8e76cc2",
  publicationState: "published" as const,
  expectedUpdatedAt: "2026-08-09T04:30:00+05:30",
};

afterEach(() => {
  vi.restoreAllMocks();
  vi.resetModules();
});

function mockPublicationDependencies({
  role = "owner",
  rpcResult,
}: {
  role?: "owner" | "admin" | "editor";
  rpcResult: {
    data: unknown;
    error: { code?: string; message?: string } | null;
  };
}) {
  const rpc = vi.fn(async () => rpcResult);
  const createClient = vi.fn(async () => ({ rpc }));
  const requireUser = vi.fn(async () => ({
    id: "8769d74c-d5f0-4e85-a2f9-9a425ba61de0",
    demo: false,
    profile: {
      accountRole: "agri_business",
      onboardingComplete: true,
      status: "active",
    },
  }));
  const loadActiveOrganizationMembership = vi.fn(async () => ({
    organizationId: input.organizationId,
    profileId: "8769d74c-d5f0-4e85-a2f9-9a425ba61de0",
    role,
    status: "active",
  }));

  vi.doMock("next/cache", () => ({ revalidatePath: vi.fn() }));
  vi.doMock("@/lib/env", () => ({ isSupabaseConfigured: () => true }));
  vi.doMock("@/lib/feature-flags", () => ({
    isFeatureEnabled: () => true,
  }));
  vi.doMock("@/features/auth/require-user", () => ({ requireUser }));
  vi.doMock("@/features/organizations/queries", () => ({
    loadActiveOrganizationMembership,
  }));
  vi.doMock("@/lib/supabase/server", () => ({ createClient }));

  return { createClient, requireUser, rpc };
}

describe("organization publication action", () => {
  it.each(["owner", "admin"] as const)(
    "allows an active %s through the atomic RPC boundary",
    async (role) => {
      const dependencies = mockPublicationDependencies({
        role,
        rpcResult: {
          data: {
            organization_id: input.organizationId,
            slug: "sahyadri-farm-tools",
            publication_state: "published",
            updated_at: "2026-08-09T00:01:00Z",
          },
          error: null,
        },
      });
      const { setOrganizationPublicationAction } = await import(
        "@/features/organizations/actions"
      );

      await expect(setOrganizationPublicationAction(input)).resolves.toEqual({
        ok: true,
        code: "PUBLICATION_UPDATED",
        data: {
          organizationId: input.organizationId,
          slug: "sahyadri-farm-tools",
          publicationState: "published",
          updatedAt: "2026-08-09T00:01:00Z",
        },
      });
      expect(dependencies.requireUser).toHaveBeenCalledOnce();
      expect(dependencies.rpc).toHaveBeenCalledWith(
        "set_organization_publication",
        {
          organization_id_input: input.organizationId,
          publication_state_input: "published",
          expected_updated_at_input: input.expectedUpdatedAt,
        },
      );
    },
  );

  it("rejects editors before opening a mutation client", async () => {
    const dependencies = mockPublicationDependencies({
      role: "editor",
      rpcResult: { data: null, error: null },
    });
    const { setOrganizationPublicationAction } = await import(
      "@/features/organizations/actions"
    );

    await expect(setOrganizationPublicationAction(input)).resolves.toMatchObject({
      ok: false,
      code: "FORBIDDEN",
    });
    expect(dependencies.createClient).not.toHaveBeenCalled();
    expect(dependencies.rpc).not.toHaveBeenCalled();
  });

  it("returns a stable publishability error without raw database details", async () => {
    mockPublicationDependencies({
      rpcResult: {
        data: null,
        error: {
          code: "55000",
          message: "registration_secret=must-not-leak",
        },
      },
    });
    const { setOrganizationPublicationAction } = await import(
      "@/features/organizations/actions"
    );

    const result = await setOrganizationPublicationAction(input);
    expect(result).toMatchObject({ ok: false, code: "NOT_PUBLISHABLE" });
    expect(JSON.stringify(result)).not.toContain("registration_secret");
  });

  it("maps a stale optimistic-concurrency write to a stable conflict", async () => {
    mockPublicationDependencies({
      rpcResult: {
        data: null,
        error: { code: "40001", message: "internal revision detail" },
      },
    });
    const { setOrganizationPublicationAction } = await import(
      "@/features/organizations/actions"
    );

    await expect(setOrganizationPublicationAction(input)).resolves.toMatchObject({
      ok: false,
      code: "CONFLICT",
    });
  });
});
