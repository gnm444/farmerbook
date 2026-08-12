import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ContextRail } from "@/components/context-rail";
import { LocaleProvider } from "@/components/locale-provider";
import { englishMessages } from "@/lib/i18n";

function renderContextRail() {
  render(
    <LocaleProvider locale="en-IN" messages={englishMessages}>
      <ContextRail />
    </LocaleProvider>,
  );
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("context rail live/demo isolation", () => {
  it("never shows fictional people or network counts merely because Supabase is absent", () => {
    vi.stubEnv("NEXT_PUBLIC_DEMO_MODE", "false");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "");

    renderContextRail();

    expect(screen.queryByText("Suresh Kale")).not.toBeInTheDocument();
    expect(screen.queryByText("Priya Nair")).not.toBeInTheDocument();
    expect(screen.queryByText("12")).not.toBeInTheDocument();
    expect(screen.getByText(/pilot community grows/i)).toBeVisible();
  });

  it("shows fictional context only in explicit demonstration mode", () => {
    vi.stubEnv("NEXT_PUBLIC_DEMO_MODE", "true");

    renderContextRail();

    expect(screen.getByText("Suresh Kale")).toBeVisible();
    expect(screen.getByText("Priya Nair")).toBeVisible();
    expect(screen.getByText("12")).toBeVisible();
  });
});
