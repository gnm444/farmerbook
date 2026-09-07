import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppShell } from "@/components/app-shell";
import { LocaleProvider } from "@/components/locale-provider";
import { getProfile } from "@/lib/demo-data";
import { englishMessages } from "@/lib/i18n";

const mocks = vi.hoisted(() => ({
  refresh: vi.fn(),
  saveLocale: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/network",
  useRouter: () => ({ refresh: mocks.refresh }),
}));

vi.mock("@/features/profiles/locale-actions", () => ({
  saveLocalePreferenceAction: mocks.saveLocale,
}));

describe("authenticated shell localization", () => {
  beforeEach(() => {
    mocks.refresh.mockReset();
    mocks.saveLocale.mockReset().mockResolvedValue({
      ok: true,
      locale: "te-IN",
      profilePersisted: false,
    });
  });

  it("re-renders navigation in the selected locale without a document reload", async () => {
    render(
      <LocaleProvider locale="en-IN" messages={englishMessages}>
        <AppShell
          currentUser={getProfile("ramesh")}
          demo={false}
          extendedLocalesEnabled
          incSourcingEnabled
        >
          <p>Route content</p>
        </AppShell>
      </LocaleProvider>,
    );

    fireEvent.change(screen.getByRole("combobox", { name: "Language" }), {
      target: { value: "te-IN" },
    });

    const primary = await screen.findByRole("navigation", { name: "ప్రధాన" });
    expect(
      within(primary).getByRole("link", { name: "వ్యవసాయ ఉత్పత్తుల మార్కెట్" }),
    ).toBeVisible();
    expect(within(primary).getByRole("link", { name: "నా ప్రొఫైల్" })).toBeVisible();
    expect(screen.getByRole("navigation", { name: "మొబైల్ నావిగేషన్" })).toBeVisible();
    await waitFor(() => expect(mocks.refresh).toHaveBeenCalledTimes(1));
  });
});
