import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  importOAuthAvatarAction,
  saveAvatarAction,
} from "@/features/profiles/actions";
import { ProfilePhotoField } from "@/features/profiles/profile-photo-field";
import { removeAvatar, uploadAvatar } from "@/features/profiles/uploads";
import { LocaleProvider } from "@/components/locale-provider";
import englishMessages from "@/lib/i18n/messages/en-IN";

vi.mock("@/features/profiles/actions", () => ({
  importOAuthAvatarAction: vi.fn(),
  saveAvatarAction: vi.fn(),
}));

vi.mock("@/features/profiles/uploads", () => ({
  uploadAvatar: vi.fn(),
  removeAvatar: vi.fn(),
}));

describe("ProfilePhotoField", () => {
  const renderPhoto = (element: React.ReactNode) => render(
    <LocaleProvider locale="en-IN" messages={englishMessages}>{element}</LocaleProvider>,
  );
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("keeps the profile photo optional and falls back to initials", () => {
    renderPhoto(<ProfilePhotoField initials="MK" />);

    expect(
      screen.getByRole("group", { name: "Profile photo (optional)" }),
    ).toBeInTheDocument();
    expect(screen.getByText("MK")).toBeInTheDocument();
    expect(screen.getByText("JPEG, PNG or WebP. Up to 5 MB.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Remove photo" })).toBeNull();
  });

  it("uses a Farmer icon when no real photo is available", () => {
    const { container } = renderPhoto(
      <ProfilePhotoField initials="MK" role="farmer" />,
    );

    expect(
      screen.getByRole("group", { name: "Farmer profile photo" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("MK")).toBeNull();
    expect(container.querySelector(".avatar svg")).not.toBeNull();
    expect(screen.getByText(/default Farmer icon/)).toBeInTheDocument();
  });

  it("imports a trusted OAuth photo into FarmerBook storage", async () => {
    vi.mocked(importOAuthAvatarAction).mockResolvedValue({
      ok: true,
      demo: false,
      path: "user/oauth-avatar.webp",
      url: "https://storage.example/oauth-avatar.webp",
    });

    renderPhoto(
      <ProfilePhotoField
        initials="MK"
        initialImageUrl="https://lh3.googleusercontent.com/avatar"
        initialSource="oauth"
        role="farmer"
      />,
    );

    await screen.findByText("Profile photo imported from your sign-in account.");
    expect(importOAuthAvatarAction).toHaveBeenCalledTimes(1);
  });

  it("replaces and removes an owned profile photo safely", async () => {
    vi.mocked(uploadAvatar).mockResolvedValue({
      path: "user/new.webp",
      url: "https://images.example/new.webp",
    });
    vi.mocked(saveAvatarAction)
      .mockResolvedValueOnce({
        ok: true,
        demo: false,
        previousPath: "user/old.webp",
      })
      .mockResolvedValueOnce({
        ok: true,
        demo: false,
        previousPath: "user/new.webp",
      });

    renderPhoto(
      <ProfilePhotoField
        initials="MK"
        initialImageUrl="https://images.example/old.webp"
        initialPath="user/old.webp"
      />,
    );

    fireEvent.change(screen.getByLabelText("Change photo"), {
      target: {
        files: [new File(["photo"], "profile.webp", { type: "image/webp" })],
      },
    });

    await screen.findByText("Profile photo updated.");
    expect(saveAvatarAction).toHaveBeenCalledWith("user/new.webp");
    expect(removeAvatar).toHaveBeenCalledWith("user/old.webp");

    const removeButton = screen.getByRole("button", { name: "Remove photo" });
    await waitFor(() => expect(removeButton).toBeEnabled());
    fireEvent.click(removeButton);

    await screen.findByText("Profile photo removed.");
    expect(saveAvatarAction).toHaveBeenLastCalledWith(undefined);
    await waitFor(() => {
      expect(removeAvatar).toHaveBeenCalledWith("user/new.webp");
    });
    expect(screen.getByText("MK")).toBeInTheDocument();
  });
});
