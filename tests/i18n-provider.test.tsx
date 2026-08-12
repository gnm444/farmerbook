import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LocaleProvider, useTranslations } from "@/components/locale-provider";
import { loadMessages } from "@/lib/i18n";

function Probe() {
  const onboarding = useTranslations("onboarding");
  return <p>{onboarding("progress", { current: 2, total: 6 })}</p>;
}

describe("LocaleProvider", () => {
  it("provides namespaced translations and synchronizes document language direction", async () => {
    const messages = await loadMessages("ur-IN");
    render(
      <LocaleProvider locale="ur-IN" messages={messages}>
        <Probe />
      </LocaleProvider>,
    );

    expect(screen.getByText(/2.*6/)).toBeInTheDocument();
    await waitFor(() => {
      expect(document.documentElement).toHaveAttribute("lang", "ur-IN");
      expect(document.documentElement).toHaveAttribute("dir", "rtl");
    });
  });
});
