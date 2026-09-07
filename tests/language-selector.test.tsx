import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LanguageSelector } from "@/components/language-selector";
import {
  LocaleProvider,
  useAuthenticatedMessages,
  useLocale,
} from "@/components/locale-provider";
import {
  authenticatedMessages,
  getAuthenticatedMessages,
} from "@/lib/i18n/authenticated-messages";
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

function InterfaceProbe() {
  const locale = useLocale();
  const { navigation } = useAuthenticatedMessages();
  return <p>{locale}:{navigation.network}</p>;
}

function renderReactiveSelector() {
  render(
    <LocaleProvider locale="en-IN" messages={englishMessages}>
      <LanguageSelector />
      <InterfaceProbe />
    </LocaleProvider>,
  );
}

describe("language selector release boundary", () => {
  beforeEach(() => {
    mocks.refresh.mockReset();
    mocks.saveLocale.mockReset().mockImplementation(async (locale) => ({
      ok: true,
      locale,
      profilePersisted: false,
    }));
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

  it("localizes the beta disclosure for unreviewed locales", () => {
    renderSelector("ta-IN", true);

    expect(
      screen.getByText(authenticatedMessages["ta-IN"].betaDisclosure),
    ).toBeVisible();
    expect(screen.queryByText(/falls back to Indian English/i)).not.toBeInTheDocument();
  });

  it("updates mounted interface copy before persistence and refresh finish", async () => {
    let resolveSave: ((value: unknown) => void) | undefined;
    mocks.saveLocale.mockImplementation(
      () => new Promise((resolve) => { resolveSave = resolve; }),
    );
    renderReactiveSelector();

    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "te-IN" },
    });

    expect(
      await screen.findByText(`te-IN:${authenticatedMessages["te-IN"].navigation.network}`),
    ).toBeVisible();
    expect(document.documentElement).toHaveAttribute("lang", "te-IN");
    expect(mocks.refresh).not.toHaveBeenCalled();

    await act(async () => {
      resolveSave?.({ ok: true, locale: "te-IN", profilePersisted: false });
    });
    await waitFor(() => expect(mocks.refresh).toHaveBeenCalledTimes(1));
  });

  it("switches from English to every exposed locale", async () => {
    renderReactiveSelector();

    for (const supportedLocale of SUPPORTED_LOCALES.slice(1)) {
      fireEvent.change(screen.getByRole("combobox"), {
        target: { value: supportedLocale },
      });
      expect(
        await screen.findByText(
          `${supportedLocale}:${authenticatedMessages[supportedLocale].navigation.network}`,
        ),
        supportedLocale,
      ).toBeVisible();
      await waitFor(() => {
        expect(screen.getByRole("combobox")).not.toBeDisabled();
      });
    }

    expect(mocks.saveLocale).toHaveBeenCalledTimes(SUPPORTED_LOCALES.length - 1);
    expect(mocks.refresh).toHaveBeenCalledTimes(SUPPORTED_LOCALES.length - 1);
    expect(document.documentElement).toHaveAttribute("lang", "ur-IN");
    expect(document.documentElement).toHaveAttribute("dir", "rtl");
  });

  it("does not refresh when persistence fails and exposes a stable error", async () => {
    mocks.saveLocale.mockResolvedValue({
      ok: false,
      code: "cookie_write_failed",
    });
    renderReactiveSelector();

    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "hi-IN" },
    });

    expect(await screen.findByRole("alert")).toHaveTextContent(
      englishMessages.errors.generic,
    );
    expect(screen.getByText(`en-IN:${getAuthenticatedMessages("en-IN").navigation.network}`)).toBeVisible();
    expect(mocks.refresh).not.toHaveBeenCalled();
  });

  it("rolls back when the persistence request itself rejects", async () => {
    mocks.saveLocale.mockRejectedValue(new Error("offline"));
    renderReactiveSelector();

    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "te-IN" },
    });

    expect(await screen.findByRole("alert")).toHaveTextContent(
      englishMessages.errors.generic,
    );
    expect(screen.getByText("en-IN:Network")).toBeVisible();
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
