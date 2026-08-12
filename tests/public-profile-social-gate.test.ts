import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.restoreAllMocks();
  vi.resetModules();
});

function arrange(social: {
  linkedin_url?: string | null;
  instagram_url?: string | null;
  facebook_url?: string | null;
  youtube_url?: string | null;
}) {
  const requireUser = vi.fn(async () => ({
    id: "00000000-0000-4000-8000-000000000701",
    demo: false,
    profile: { accountRole: "farmer" },
  }));
  const maybeSingle = vi.fn(async () => ({
    data: {
      linkedin_url: null,
      instagram_url: null,
      facebook_url: null,
      youtube_url: null,
      ...social,
    },
    error: null,
  }));
  const selectEq = vi.fn(() => ({ maybeSingle }));
  const select = vi.fn(() => ({ eq: selectEq }));
  const updateEq = vi.fn(async () => ({ error: null }));
  const update = vi.fn(() => ({ eq: updateEq }));
  const from = vi.fn(() => ({ select, update }));
  vi.doMock("@/features/auth/require-user", () => ({ requireUser }));
  vi.doMock("@/lib/supabase/server", () => ({
    createClient: vi.fn(async () => ({ from })),
  }));
  vi.doMock("@/features/analytics/events", () => ({
    recordProductEvent: vi.fn(),
  }));
  return { from, update };
}

describe("public Farmer social-link gate", () => {
  it("does not publish a Farmer profile without a supported social link", async () => {
    const mocks = arrange({});
    const { savePublicProfileAction } = await import(
      "@/features/profiles/actions"
    );
    await expect(savePublicProfileAction(true)).resolves.toMatchObject({
      ok: false,
      message: expect.stringContaining("Add at least one"),
    });
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("allows publication after a supported social link is present", async () => {
    const mocks = arrange({
      youtube_url: "https://www.youtube.com/@anita-farms",
    });
    const { savePublicProfileAction } = await import(
      "@/features/profiles/actions"
    );
    await expect(savePublicProfileAction(true)).resolves.toEqual({
      ok: true,
      demo: false,
    });
    expect(mocks.update).toHaveBeenCalledWith(
      expect.objectContaining({ public_profile_enabled: true }),
    );
  });

  it("does not treat a YouTube video as an owned account link", async () => {
    const mocks = arrange({
      youtube_url: "https://www.youtube.com/watch?v=ABC123",
    });
    const { savePublicProfileAction } = await import(
      "@/features/profiles/actions"
    );
    await expect(savePublicProfileAction(true)).resolves.toMatchObject({
      ok: false,
      message: expect.stringContaining("Add at least one"),
    });
    expect(mocks.update).not.toHaveBeenCalled();
  });
});
