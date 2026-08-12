import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { saveProfileCoverAction } from "@/features/profiles/actions";
import { ProfileCoverField } from "@/features/profiles/profile-cover-field";
import { removeProfileImage, uploadProfileCover } from "@/features/profiles/uploads";
import { LocaleProvider } from "@/components/locale-provider";
import englishMessages from "@/lib/i18n/messages/en-IN";

vi.mock("@/features/profiles/actions", () => ({
  saveProfileCoverAction: vi.fn(),
}));

vi.mock("@/features/profiles/uploads", () => ({
  uploadProfileCover: vi.fn(),
  removeProfileImage: vi.fn(),
}));

describe("ProfileCoverField", () => {
  const renderCover = (element: React.ReactNode) => render(
    <LocaleProvider locale="en-IN" messages={englishMessages}>{element}</LocaleProvider>,
  );
  beforeEach(() => vi.clearAllMocks());

  it("shows the branded fallback when no background is stored", () => {
    renderCover(<ProfileCoverField />);
    expect(screen.getByText("FarmerBook background")).toBeInTheDocument();
    expect(screen.getByText(/ideally 1600 × 500/i)).toBeInTheDocument();
  });

  it("replaces and removes an owned background safely", async () => {
    vi.mocked(uploadProfileCover).mockResolvedValue({
      path: "user/cover-new.webp",
      url: "https://images.example/cover-new.webp",
    });
    vi.mocked(saveProfileCoverAction)
      .mockResolvedValueOnce({ ok: true, demo: false, previousPath: "user/cover-old.webp" })
      .mockResolvedValueOnce({ ok: true, demo: false, previousPath: "user/cover-new.webp" });

    renderCover(
      <ProfileCoverField
        initialImageUrl="https://images.example/cover-old.webp"
        initialPath="user/cover-old.webp"
      />,
    );

    fireEvent.change(screen.getByLabelText("Change background"), {
      target: { files: [new File(["photo"], "cover.webp", { type: "image/webp" })] },
    });

    await screen.findByText("Profile background updated.");
    expect(saveProfileCoverAction).toHaveBeenCalledWith("user/cover-new.webp");
    expect(removeProfileImage).toHaveBeenCalledWith("user/cover-old.webp");

    const removeButton = screen.getByRole("button", { name: "Remove background" });
    await waitFor(() => expect(removeButton).toBeEnabled());
    fireEvent.click(removeButton);
    await screen.findByText("Profile background removed.");
    expect(saveProfileCoverAction).toHaveBeenLastCalledWith(undefined);
    await waitFor(() => {
      expect(removeProfileImage).toHaveBeenCalledWith("user/cover-new.webp");
    });
  });
});
