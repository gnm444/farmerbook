import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  enabled: vi.fn(() => true),
  requireAdmin: vi.fn(async () => ({ id: "real-admin", demo: false })),
  notFound: vi.fn(() => { throw new Error("NOT_FOUND"); }),
}));

vi.mock("@/lib/feature-flags", () => ({ isFeatureEnabled: mocks.enabled }));
vi.mock("@/features/auth/require-admin", () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock("next/navigation", () => ({ notFound: mocks.notFound }));
vi.mock("@/features/workshops/workshop-admin-roster", () => ({
  WorkshopAdminRoster: () => <div>Private roster</div>,
}));

import AdminWorkshopsPage, { metadata } from "@/app/(product)/admin/workshops/page";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.enabled.mockReturnValue(true);
  mocks.requireAdmin.mockResolvedValue({ id: "real-admin", demo: false });
});

describe("workshop administrator page", () => {
  it("shows the roster only after a real admin gate and prevents indexing", async () => {
    const html = renderToStaticMarkup(await AdminWorkshopsPage());
    expect(mocks.requireAdmin).toHaveBeenCalledOnce();
    expect(html).toContain("Private roster");
    expect(html).toContain('href="/workshops/hari-babu-2026"');
    expect(metadata.robots).toEqual({ index: false, follow: false });
  });

  it("rejects demo access", async () => {
    mocks.requireAdmin.mockResolvedValue({ id: "demo-admin", demo: true });
    await expect(AdminWorkshopsPage()).rejects.toThrow("NOT_FOUND");
  });

  it("hides the route while the release flag is off", async () => {
    mocks.enabled.mockReturnValue(false);
    await expect(AdminWorkshopsPage()).rejects.toThrow("NOT_FOUND");
    expect(mocks.requireAdmin).not.toHaveBeenCalled();
  });
});
