import { readFileSync } from "node:fs";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  isOrganicCertificationClaim,
  NON_CERTIFIED_ORGANIC_LABEL,
  OrganicCertificationLabel,
} from "@/features/profiles/organic-certification";
import { getProfile } from "@/lib/demo-data";

describe("organic farmer certification proof", () => {
  const migration = readFileSync(
    "supabase/migrations/20260818120000_organic_farmer_certification.sql",
    "utf8",
  );

  it("shows the required non-certified label until paperwork is verified", () => {
    const profile = getProfile("ramesh");
    render(<OrganicCertificationLabel profile={profile} />);
    expect(screen.getByText(NON_CERTIFIED_ORGANIC_LABEL)).toBeInTheDocument();
  });

  it("shows Certified organic only for the authoritative verified status", () => {
    const profile = { ...getProfile("ramesh"), organicCertificationVerified: true };
    render(<OrganicCertificationLabel profile={profile} />);
    expect(screen.getByText("Certified organic")).toBeInTheDocument();
    expect(screen.queryByText(NON_CERTIFIED_ORGANIC_LABEL)).toBeNull();
  });

  it("does not add certification labels to non-organic methods", () => {
    render(<OrganicCertificationLabel profile={getProfile("meera")} />);
    expect(screen.queryByText(/certified organic/i)).toBeNull();
  });

  it("recognizes certification claims that listings must not self-declare", () => {
    expect(isOrganicCertificationClaim("Certified organic")).toBe(true);
    expect(isOrganicCertificationClaim("NPOP certificate")).toBe(true);
    expect(isOrganicCertificationClaim("Farm identity provided")).toBe(false);
  });

  it("keeps documents private and requires upload plus administrator review", () => {
    expect(migration).toContain("'organic-certificates'");
    expect(migration).toMatch(/'organic-certificates',\s*'organic-certificates',\s*false/);
    expect(migration).toContain("ORGANIC_CERTIFICATE_UPLOAD_REQUIRED");
    expect(migration).toContain("review_organic_certification");
    expect(migration).toContain("decision_input not in ('verified', 'rejected')");
    expect(migration).toContain("public_organic_certification_status");
    expect(migration).toContain("produce_listings_prevent_organic_certification_claim");
  });
});
