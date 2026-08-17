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

  it("ships the locale catalog on while keeping unreleased features off", () => {
    for (const name of featureFlagNames) vi.stubEnv(name, "");

    expect(Object.values(getFeatureFlags())).toEqual(
      featureFlagNames.map((name) => name === "ENABLE_EXTENDED_LOCALES"),
    );
  });

  it("enables only an explicit true value", () => {
    vi.stubEnv("ENABLE_AGRI_BUSINESSES", "true");
    vi.stubEnv("ENABLE_BUSINESS_OFFERS", "1");

    expect(isFeatureEnabled("ENABLE_AGRI_BUSINESSES")).toBe(true);
    expect(isFeatureEnabled("ENABLE_BUSINESS_OFFERS")).toBe(false);
  });

  it("retains an explicit rollback switch for extended locales", () => {
    vi.stubEnv("ENABLE_EXTENDED_LOCALES", "false");

    expect(isFeatureEnabled("ENABLE_EXTENDED_LOCALES")).toBe(false);
  });
});
