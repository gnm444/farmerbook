import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const enquiryInput = {
  listingId: "listing-1",
  buyerName: "Asha Rao",
  businessName: "Asha Foods",
  email: "asha@example.test",
  phone: "+91 98765 43210",
  location: "Pune, Maharashtra",
  quantityNeeded: "250 kg weekly",
  needBy: "2026-08-20",
  message: "Please confirm grade, packing, and delivery availability.",
  website: "",
};

afterEach(() => {
  vi.restoreAllMocks();
  vi.resetModules();
});

function mockGateDependencies(user: { id: string } | null, configured = true) {
  const getUser = vi.fn(async () => ({ data: { user }, error: null }));
  const createClient = vi.fn(async () => ({ auth: { getUser } }));

  vi.doMock("@/lib/env", () => ({
    isSupabaseConfigured: () => configured,
  }));
  vi.doMock("@/lib/supabase/server", () => ({ createClient }));
  vi.doMock("@/lib/i18n", () => ({
    getServerTranslations: vi.fn(async () => ({
      locale: "en-IN",
      t: (key: string) => ({
        enquirySignInGate: "FarmerBook accepts produce enquiries only from active, signed-in participants. Contact details are not collected on this public page.",
        signInToEnquire: "Sign in to enquire",
      })[key] ?? key,
    })),
  }));
  vi.doMock("@/features/marketplace/inquiry-form", () => ({
    InquiryForm: ({ listingId, sellerName }: {
      listingId: string;
      sellerName: string;
    }) => (
      <div data-testid="inquiry-form">
        {listingId}:{sellerName}
      </div>
    ),
  }));

  return { createClient, getUser };
}

describe("produce enquiry authentication boundary", () => {
  it("does not render contact fields for an anonymous visitor", async () => {
    mockGateDependencies(null);
    const { ProduceInquiryGate } = await import(
      "@/features/marketplace/inquiry-gate"
    );

    render(
      await ProduceInquiryGate({ listingId: "listing-1", sellerName: "Meera" }),
    );

    expect(screen.queryByTestId("inquiry-form")).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Sign in to enquire" }),
    ).toHaveAttribute("href", "/login");
    expect(screen.getByText(/contact details are not collected/i)).toBeVisible();
  });

  it("renders the enquiry form only for an authenticated visitor", async () => {
    mockGateDependencies({ id: "buyer-1" });
    const { ProduceInquiryGate } = await import(
      "@/features/marketplace/inquiry-gate"
    );

    render(
      await ProduceInquiryGate({ listingId: "listing-1", sellerName: "Meera" }),
    );

    expect(screen.getByTestId("inquiry-form")).toHaveTextContent(
      "listing-1:Meera",
    );
    expect(
      screen.queryByRole("link", { name: "Sign in to enquire" }),
    ).not.toBeInTheDocument();
  });

  it("fails closed without opening a client when Supabase is unconfigured", async () => {
    const { createClient } = mockGateDependencies(null, false);
    const { ProduceInquiryGate } = await import(
      "@/features/marketplace/inquiry-gate"
    );

    render(
      await ProduceInquiryGate({ listingId: "listing-1", sellerName: "Meera" }),
    );

    expect(createClient).not.toHaveBeenCalled();
    expect(
      screen.getByRole("link", { name: "Sign in to enquire" }),
    ).toBeVisible();
  });

  it("rejects direct anonymous action calls without invoking a database RPC", async () => {
    const rpc = vi.fn();
    vi.doMock("@/lib/env", () => ({
      isDemoMode: () => false,
      isSupabaseConfigured: () => true,
    }));
    vi.doMock("@/features/auth/require-user", () => ({
      isSellerRole: vi.fn(),
      requireUser: vi.fn(),
    }));
    vi.doMock("@/features/auth/capabilities", () => ({ canSource: vi.fn() }));
    vi.doMock("@/lib/supabase/server", () => ({
      createClient: vi.fn(async () => ({
        auth: {
          getUser: vi.fn(async () => ({ data: { user: null }, error: null })),
        },
        rpc,
      })),
    }));
    const { createMarketEnquiryAction } = await import(
      "@/features/marketplace/actions"
    );

    await expect(createMarketEnquiryAction(enquiryInput)).resolves.toEqual({
      ok: false,
      message: "Sign in with an active FarmerBook account to contact this seller.",
    });
    expect(rpc).not.toHaveBeenCalled();
  });
});
