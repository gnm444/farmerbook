import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/features/farmer-database/actions", () => ({
  addPrivateFarmerContactAction: vi.fn(),
  createFarmerContactListAction: vi.fn(),
  discoverYouTubeFarmerChannelsAction: vi.fn(),
  importPrivateFarmerContactsAction: vi.fn(),
  preparePrivateFarmerEmailAction: vi.fn(),
  privateFarmerContactCsvDryRunAction: vi.fn(),
  updatePrivateFarmerContactAction: vi.fn(),
}));

import { FarmerDatabaseConsole } from "@/features/farmer-database/farmer-database-console";

describe("private Farmer database console", () => {
  it("fails closed without configuration", () => {
    render(<FarmerDatabaseConsole
      configured={false}
      youtubeConfigured={false}
      lists={[]}
      contacts={[]}
      events={[]}
      discoveryRuns={[]}
      summary={{ total: 0, emailConsented: 0, pending: 0, expired: 0, suppressed: 0 }}
    />);
    expect(screen.getByRole("heading", { name: /private database is off/i })).toBeInTheDocument();
    expect(screen.queryByText(/youtube discovery agent/i)).not.toBeInTheDocument();
  });

  it("states the privacy and transient discovery boundaries", () => {
    render(<FarmerDatabaseConsole
      configured
      youtubeConfigured
      lists={[]}
      contacts={[]}
      events={[]}
      discoveryRuns={[]}
      summary={{ total: 0, emailConsented: 0, pending: 0, expired: 0, suppressed: 0 }}
    />);
    expect(screen.getByText(/private to your administrator account/i)).toBeInTheDocument();
    expect(screen.getByText(/youtube results are transient/i)).toBeInTheDocument();
    expect(screen.getByText(/does not scrape about pages/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /whatsapp/i })).not.toBeInTheDocument();
  });
});
