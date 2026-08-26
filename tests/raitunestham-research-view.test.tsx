import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  RAITU_NESTHAM_RESEARCH,
  summarizeRaituNesthamResearch,
} from "@/features/sourced-farmers/raitunestham-research.server";
import { RaituNesthamResearchView } from "@/features/sourced-farmers/raitunestham-research-view";

describe("Raitu Nestham private research view", () => {
  it("renders the source, phone and exact consent warning without a mutation action", () => {
    const record = RAITU_NESTHAM_RESEARCH.find(
      (candidate) => candidate.id === "komatla-nancha-reddy-groundnut",
    );
    expect(record).toBeDefined();

    render(
      <RaituNesthamResearchView
        records={[record!]}
        summary={summarizeRaituNesthamResearch()}
        filters={{ q: "", priority: "" }}
      />,
    );

    expect(screen.getByText("Komatla Nancha Reddy")).toBeInTheDocument();
    expect(screen.getByText("+91 98498 52470")).toHaveAttribute(
      "href",
      "tel:+919849852470",
    );
    expect(
      screen.getByText("Public/unverified · not outreach consent"),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /open source video/i })).toHaveAttribute(
      "href",
      record!.youtubeSource,
    );
    expect(screen.getByRole("link", { name: /open source video/i })).toHaveAttribute(
      "rel",
      "noreferrer",
    );
    expect(
      screen.queryByRole("button", {
        name: /send|message|invite|import|publish|verify|contact/i,
      }),
    ).not.toBeInTheDocument();
  });

  it("renders an honest empty state for unmatched server filters", () => {
    render(
      <RaituNesthamResearchView
        records={[]}
        summary={summarizeRaituNesthamResearch()}
        filters={{ q: "unknown", priority: "" }}
      />,
    );
    expect(screen.getByText("No reviewed profiles match these filters.")).toBeInTheDocument();
  });
});
