import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LocaleProvider } from "@/components/locale-provider";
import { ProfileSettingsForm } from "@/features/profiles/profile-settings-form";
import { getProfile } from "@/lib/demo-data";
import englishMessages from "@/lib/i18n/messages/en-IN";

const mocks = vi.hoisted(() => ({
  saveProfile: vi.fn(async (input: unknown) => {
    void input;
    return { ok: true as const };
  }),
}));

vi.mock("@/features/profiles/actions", () => ({
  saveProfileAction: mocks.saveProfile,
}));
vi.mock("@/features/profiles/profile-photo-field", () => ({
  ProfilePhotoField: () => <div data-testid="profile-photo" />,
}));
vi.mock("@/features/profiles/profile-cover-field", () => ({
  ProfileCoverField: () => <div data-testid="profile-cover" />,
}));
vi.mock("@/features/profiles/profile-home-settings", () => ({
  ProfileHomeSettings: () => <div data-testid="profile-home" />,
}));
vi.mock("@/components/language-selector", () => ({
  LanguageSelector: ({ label }: { label: string }) => <div>{label}</div>,
}));

describe("profile settings agriculture categories", () => {
  it("preserves existing crops and saves a newly selected catalog product", async () => {
    render(
      <LocaleProvider locale="en-IN" messages={englishMessages}>
        <ProfileSettingsForm
          profile={getProfile("meera")}
          extendedLocalesEnabled={false}
        />
      </LocaleProvider>,
    );

    expect(
      screen.getByLabelText("Selected agriculture categories"),
    ).toHaveTextContent(/Tomato.*Onion.*Okra/);
    fireEvent.change(screen.getByLabelText("Search agriculture categories"), {
      target: { value: "doodh" },
    });
    fireEvent.click(screen.getByRole("checkbox", { name: "Milk" }));
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => expect(mocks.saveProfile).toHaveBeenCalledOnce());
    expect(mocks.saveProfile.mock.calls[0]?.[0]).toMatchObject({
      crops: ["Tomato", "Onion", "Okra", "Milk"],
    });
  });
});
