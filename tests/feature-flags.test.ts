import { afterEach, describe, expect, it, vi } from "vitest";
import {
  featureFlagNames,
  getFeatureFlags,
  isFeatureEnabled,
} from "@/lib/feature-flags";

describe("ecosystem feature flags", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("keeps every release flag disabled by default", () => {
    for (const name of featureFlagNames) vi.stubEnv(name, "");

    expect(Object.values(getFeatureFlags())).toEqual(
      featureFlagNames.map(() => false),
    );
  });

  it("enables only an explicit true value", () => {
    vi.stubEnv("ENABLE_AGRI_BUSINESSES", "true");
    vi.stubEnv("ENABLE_BUSINESS_OFFERS", "1");

    expect(isFeatureEnabled("ENABLE_AGRI_BUSINESSES")).toBe(true);
    expect(isFeatureEnabled("ENABLE_BUSINESS_OFFERS")).toBe(false);
  });
});
