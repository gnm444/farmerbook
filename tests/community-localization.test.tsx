import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LocaleProvider } from "@/components/locale-provider";
import { DiscoverClient } from "@/features/network/discover-client";
import { DiscoverHeader } from "@/features/network/discover-header";
import { NetworkClient } from "@/features/network/network-client";
import { NetworkHeader } from "@/features/network/network-header";
import { loadMessages } from "@/lib/i18n";

describe("community page localization", () => {
  it("renders Network headings, tabs, actions, and labels in Telugu", async () => {
    const messages = await loadMessages("te-IN");
    render(
      <LocaleProvider locale="te-IN" messages={messages}>
        <NetworkHeader />
        <NetworkClient initialFollowing={[]} followers={[]} />
      </LocaleProvider>,
    );

    expect(screen.getByRole("heading", { name: "మీ నెట్‌వర్క్" })).toBeVisible();
    expect(screen.getByRole("link", { name: /వ్యక్తులను కనుగొనండి/ })).toBeVisible();
    expect(screen.getByRole("tab", { name: /అనుసరిస్తున్నారు/ })).toBeVisible();
    expect(screen.getByRole("tab", { name: /అనుచరులు/ })).toBeVisible();
  });

  it("renders Discover headings, filters, counts, and empty state in Telugu", async () => {
    const messages = await loadMessages("te-IN");
    render(
      <LocaleProvider locale="te-IN" messages={messages}>
        <DiscoverHeader />
        <DiscoverClient profiles={[]} />
      </LocaleProvider>,
    );

    expect(screen.getByRole("heading", { name: "వ్యక్తులను కనుగొనండి" })).toBeVisible();
    expect(screen.getByPlaceholderText("పేరు లేదా హ్యాండిల్ వెతకండి")).toBeVisible();
    expect(screen.getByText("0 మంది కనిపించారు")).toBeVisible();
    expect(screen.getByRole("heading", { name: "ఈ ఫిల్టర్లకు ఎవరూ సరిపోలలేదు" })).toBeVisible();
    expect(screen.getByRole("button", { name: "ఫిల్టర్లను తొలగించండి" })).toBeVisible();
  });
});
