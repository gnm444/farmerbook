import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/features/outreach/actions", () => ({
  researchOutreachSourceAction: vi.fn(),
  setOutreachDeliveryPauseAction: vi.fn(),
  suppressOutreachProspectAction: vi.fn(),
  privacyDeleteOutreachProspectAction: vi.fn(),
  retryOutreachFailureAction: vi.fn(),
  loadOutreachProspectHistoryAction: vi.fn(),
}));
vi.mock("@/features/profile-agent/actions", () => ({
  buildManagedFarmerProfileSampleAction: vi.fn(),
  discoverManagedFarmerProfileByNameAction: vi.fn(),
}));

import { OutreachConsole } from "@/features/outreach/outreach-console";

describe("outreach administrator console", () => {
  it("shows pause, privacy and retry-safe controls without contact values or force-send", () => {
    render(
      <OutreachConsole
        enabled
        nameSearchEnabled
        summary={{
          discovered: 1,
          blocked: 0,
          consented: 1,
          introduced: 0,
          onboarding: 0,
          joined: 0,
          optedOut: 0,
        }}
        health={{
          deliveryPaused: true,
          pauseReason: "Awaiting reviewed provider activation.",
          pendingCount: 1,
          failedCount: 1,
          lastDeliveredAt: null,
          lastProviderEventAt: null,
        }}
        failures={[
          {
            id: "00000000-0000-4000-8000-000000000201",
            prospectId: "00000000-0000-4000-8000-000000000202",
            businessName: "Example farm",
            purpose: "farmerbook_introduction",
            attempts: 2,
            failureCode: "PROVIDER_TIMEOUT",
            createdAt: "2026-08-10T10:00:00.000Z",
            expiresAt: "2099-08-10T10:00:00.000Z",
          },
        ]}
        prospects={[
          {
            id: "00000000-0000-4000-8000-000000000202",
            sourceUrl: "https://example.test/farm",
            sourceType: "website",
            businessName: "Example farm",
            status: "consented",
            suggestedRole: "farmer",
            preferredLocale: "en-IN",
            categorySlugs: ["poultry"],
            introductionDraft: null,
            consentChannel: "email",
            consentGrantedAt: "2026-08-10T09:00:00.000Z",
            consentWithdrawnAt: null,
            retentionExpiresAt: "2026-11-10T09:00:00.000Z",
            revision: 1,
            createdAt: "2026-08-10T08:00:00.000Z",
            updatedAt: "2026-08-10T09:00:00.000Z",
          },
        ]}
      />,
    );
    expect(screen.getByRole("button", { name: /resume consented delivery/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /retry once/i })).toBeInTheDocument();
    expect(screen.getByText(/audit and privacy controls/i)).toBeInTheDocument();
    expect(screen.queryByText(/grower@example/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/force send/i)).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /find and build private sample/i }),
    ).toBeEnabled();
    expect(screen.getByLabelText(/farmer full name/i)).toBeInTheDocument();
  });
});
