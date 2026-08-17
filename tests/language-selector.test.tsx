import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LanguageSelector } from "@/components/language-selector";
import { LocaleProvider } from "@/components/locale-provider";
import { englishMessages, SUPPORTED_LOCALES } from "@/lib/i18n";

const mocks = vi.hoisted(() => ({
  refresh: vi.fn(),
  saveLocale: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
}));
vi.mock("@/features/profiles/locale-actions", () => ({
  saveLocalePreferenceAction: mocks.saveLocale,
}));

function renderSelector(
  locale: "en-IN" | "ta-IN",
  extendedLocalesEnabled: boolean,
) {
  render(
    <LocaleProvider locale={locale} messages={englishMessages}>
      <LanguageSelector extendedLocalesEnabled={extendedLocalesEnabled} />
    </LocaleProvider>,
  );
}

describe("language selector release boundary", () => {
  beforeEach(() => {
    mocks.refresh.mockReset();
    mocks.saveLocale.mockReset().mockResolvedValue({
      ok: true,
      locale: "hi-IN",
      profilePersisted: false,
    });
  });

  it("offers only reviewed core locales while the extended release is off", () => {
    renderSelector("en-IN", false);

    expect(screen.getAllByRole("option")).toHaveLength(3);
    expect(screen.getByRole("option", { name: "English" })).toBeVisible();
    expect(screen.queryByRole("option", { name: /Tamil/i })).not.toBeInTheDocument();
  });

  it("offers all supported Indian locales when the extended release is on", () => {
    renderSelector("en-IN", true);

    expect(screen.getAllByRole("option")).toHaveLength(SUPPORTED_LOCALES.length);
    expect(screen.getByRole("option", { name: /Tamil/i })).toBeVisible();
  });

  it("offers all supported Indian locales by default", () => {
    render(
      <LocaleProvider locale="en-IN" messages={englishMessages}>
        <LanguageSelector />
      </LocaleProvider>,
    );

    expect(screen.getAllByRole("option")).toHaveLength(SUPPORTED_LOCALES.length);
  });

  it("keeps a previously selected beta locale visible during rollback", () => {
    renderSelector("ta-IN", false);

    expect(screen.getAllByRole("option")).toHaveLength(4);
    expect(screen.getByRole("option", { name: /Tamil/i })).toBeVisible();
  });

  it("persists Hindi and refreshes the server-rendered route", async () => {
    renderSelector("en-IN", false);

    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "hi-IN" },
    });

    await waitFor(() => {
      expect(mocks.saveLocale).toHaveBeenCalledWith("hi-IN");
      expect(mocks.refresh).toHaveBeenCalledTimes(1);
    });
  });

  it("discloses the Indian English fallback for unreviewed locales", () => {
    renderSelector("ta-IN", true);

    expect(
      screen.getByText(/falls back to Indian English/i),
    ).toHaveAttribute("lang", "en-IN");
  });

  it("does not refresh when persistence fails and exposes a stable error", async () => {
    mocks.saveLocale.mockResolvedValue({
      ok: false,
      code: "cookie_write_failed",
    });
    renderSelector("en-IN", false);

    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "hi-IN" },
    });

    expect(await screen.findByRole("alert")).toHaveTextContent(
      englishMessages.errors.generic,
    );
    expect(mocks.refresh).not.toHaveBeenCalled();
  });

  it("refreshes after a cookie save while warning that profile sync failed", async () => {
    mocks.saveLocale.mockResolvedValue({
      ok: true,
      locale: "hi-IN",
      profilePersisted: false,
      warning: "profile_write_failed",
    });
    renderSelector("en-IN", false);

    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "hi-IN" },
    });

    expect(await screen.findByText(englishMessages.errors.profileSave)).toHaveAttribute(
      "role",
      "status",
    );
    await waitFor(() => expect(mocks.refresh).toHaveBeenCalledTimes(1));
  });
});
