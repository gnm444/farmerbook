import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));
vi.mock("@/features/profile-agent/known-farmer-actions", () => ({
  addKnownFarmerSourceAction: vi.fn(),
  buildKnownFarmerProfileAction: vi.fn(),
  createKnownFarmerIntakeAction: vi.fn(),
  decideKnownFarmerCandidateAction: vi.fn(),
  searchKnownFarmerYouTubeAction: vi.fn(),
}));

import { KnownFarmerConsole } from "@/features/profile-agent/known-farmer-console";

describe("Known Farmer Intake console", () => {
  it("requires a bounded relationship confirmation before creating an intake", () => {
    render(<KnownFarmerConsole available intakes={[]} />);
    expect(
      screen.getByRole("heading", { name: "Create a private intake" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("checkbox")).toBeRequired();
    expect(
      screen.getByText(/does not assert verification, consent, or endorsement/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Create Known Farmer Intake/i }),
    ).toBeEnabled();
  });

  it("keeps a YouTube video as coverage and blocks build without an owned account", () => {
    render(
      <KnownFarmerConsole
        available
        intakes={[{
          id: "00000000-0000-4000-8000-000000000901",
          created_by: "00000000-0000-4000-8000-000000000902",
          subject_name: "Anita Patil",
          location_hint: "Nashik Maharashtra",
          farming_hint: "grapes",
          preferred_locale: "mr-IN",
          relationship_basis: "team_known",
          social_discovery_completed_at: "2026-08-12T00:00:00.000Z",
          state: "research_incomplete",
          prospect_id: null,
          sample_id: null,
          retention_expires_at: "2026-09-11T00:00:00.000Z",
          revision: 1,
          created_at: "2026-08-12T00:00:00.000Z",
          updated_at: "2026-08-12T00:00:00.000Z",
          google_query_hash: "a".repeat(64),
          googleResearchUrl:
            "https://www.google.com/search?q=Anita+Patil+farmer",
          googleResearchQuery: '"Anita Patil" farmer agriculture farming Nashik Maharashtra grapes India',
          candidates: [{
            id: "00000000-0000-4000-8000-000000000903",
            intake_id: "00000000-0000-4000-8000-000000000901",
            source_url: "https://www.youtube.com/watch?v=ABC123",
            source_type: "youtube",
            source_title: "Anita Patil grape farming interview",
            source_excerpt: "Anita Patil discusses grape farming in Nashik.",
            source_hash: "b".repeat(64),
            discovery_method: "youtube_data_api",
            subject_association: "third_party_coverage",
            decision: "pending",
            provider_item_id: "ABC123",
            provider_query_hash: "c".repeat(64),
            usage_rights_basis: "youtube_api_terms",
            collected_at: "2026-08-12T00:00:00.000Z",
            refresh_due_at: "2026-09-11T00:00:00.000Z",
            retention_expires_at: "2026-09-11T00:00:00.000Z",
            revision: 0,
            created_at: "2026-08-12T00:00:00.000Z",
            updated_at: "2026-08-12T00:00:00.000Z",
          }],
        }]}
      />,
    );
    expect(screen.getByRole("link", { name: /Open Google research/i })).toHaveAttribute(
      "rel",
      "noreferrer",
    );
    expect(screen.getByRole("button", { name: /Copy Google query/i })).toBeEnabled();
    expect(screen.getByRole("combobox", { name: /How is this source associated/i })).toHaveValue(
      "third_party_coverage",
    );
    expect(
      screen.getByRole("button", { name: /Build private Not verified sample/i }),
    ).toBeDisabled();
    expect(screen.getByText(/0 selected farmer-owned social links/i)).toBeInTheDocument();
  });
});
