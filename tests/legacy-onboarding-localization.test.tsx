import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LocaleProvider } from "@/components/locale-provider";
import { OnboardingForm } from "@/features/profiles/onboarding-form";
import { getProfile } from "@/lib/demo-data";
import englishMessages from "@/lib/i18n/messages/en-IN";
import hindiMessages from "@/lib/i18n/messages/hi-IN";

const mocks = vi.hoisted(() => ({
  refresh: vi.fn(),
  push: vi.fn(),
  saveLocale: vi.fn(async (locale: string) => ({
    ok: true as const,
    locale: locale as "hi-IN",
    profilePersisted: true,
  })),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mocks.refresh, push: mocks.push }),
}));
vi.mock("@/features/profiles/locale-actions", () => ({
  saveLocalePreferenceAction: mocks.saveLocale,
}));
vi.mock("@/features/profiles/profile-photo-field", () => ({
  ProfilePhotoField: () => <div data-testid="profile-photo" />,
}));

describe("legacy onboarding localization", () => {
  it("renders the default fallback onboarding form in Hindi", () => {
    render(
      <LocaleProvider locale="hi-IN" messages={hindiMessages}>
        <OnboardingForm initialProfile={getProfile("meera")} />
      </LocaleProvider>,
    );

    expect(screen.getByRole("group", { name: "आप फार्मरबुक का उपयोग कैसे करेंगे?" })).toBeVisible();
    expect(screen.getByText("किसान या उत्पादक")).toBeVisible();
    expect(screen.getByRole("button", { name: /आगे बढ़ें/ })).toBeVisible();
  });

  it("persists a Hindi selection and refreshes the route immediately", async () => {
    render(
      <LocaleProvider locale="en-IN" messages={englishMessages}>
        <OnboardingForm initialProfile={getProfile("meera")} />
      </LocaleProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    fireEvent.change(screen.getByLabelText("Interface language"), {
      target: { value: "hi-IN" },
    });

    await waitFor(() => expect(mocks.saveLocale).toHaveBeenCalledWith("hi-IN"));
    expect(mocks.refresh).toHaveBeenCalledOnce();
  });
});
