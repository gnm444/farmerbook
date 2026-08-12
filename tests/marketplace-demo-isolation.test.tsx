import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import MarketplaceDemoPage, {
  metadata,
} from "@/app/marketplace/demo/page";
import { produceListings } from "@/lib/market-data";
import { LocaleProvider } from "@/components/locale-provider";
import englishMessages from "@/lib/i18n/messages/en-IN";

vi.mock("@/components/language-selector", () => ({
  LanguageSelector: () => <label>Language<select aria-label="Language" /></label>,
}));
vi.mock("@/components/public-header", () => ({ PublicHeader: () => <header /> }));
vi.mock("@/components/public-footer", () => ({ PublicFooter: () => <footer /> }));
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => undefined }),
  headers: async () => ({ get: () => null }),
}));

describe("marketplace demonstration isolation", () => {
  it("is noindex, visibly fictional and keeps fixture cards read-only", async () => {
    window.history.replaceState(null, "", "/marketplace/demo");
    render(<LocaleProvider locale="en-IN" messages={englishMessages}>{await MarketplaceDemoPage()}</LocaleProvider>);

    expect(metadata.robots).toEqual({ index: false, follow: false });
    expect(screen.getByRole("status")).toHaveTextContent("Demonstration mode");
    expect(
      screen.getByRole("heading", {
        name: "Explore a fictional FarmerBook marketplace",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Nothing here is a live offer/i)).toBeInTheDocument();

    for (const listing of produceListings) {
      expect(screen.getByText(listing.title)).toBeInTheDocument();
      expect(
        screen.queryByRole("link", { name: listing.title }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("link", { name: `View ${listing.title}` }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: `Save ${listing.title}` }),
      ).not.toBeInTheDocument();
    }

    expect(screen.queryByText("Send buyer enquiry")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Create your seller profile" }),
    ).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Search produce, variety or seller"), {
      target: { value: "grapes" },
    });
    await waitFor(() => {
      expect(window.location.pathname).toBe("/marketplace/demo");
      expect(window.location.search).toBe("?q=grapes");
    });
  });
});
