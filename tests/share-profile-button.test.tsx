import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ShareProfileButton } from "@/features/profiles/share-profile-button";
import { LocaleProvider } from "@/components/locale-provider";
import englishMessages from "@/lib/i18n/messages/en-IN";

describe("ShareProfileButton", () => {
  const renderButton = (element: React.ReactNode) => render(
    <LocaleProvider locale="en-IN" messages={englishMessages}>{element}</LocaleProvider>,
  );
  beforeEach(() => {
    Object.defineProperty(navigator, "share", { configurable: true, value: undefined });
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
  });

  it("copies the canonical public profile URL when Web Share is unavailable", async () => {
    renderButton(<ShareProfileButton handle="meera_kulkarni" fullName="Meera Kulkarni" />);
    fireEvent.click(screen.getByRole("button", { name: "Share profile" }));

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        "http://localhost:3000/profile/meera_kulkarni",
      );
    });
    expect(await screen.findByRole("status")).toHaveTextContent("Profile link copied.");
  });

  it("uses the native share sheet when available", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "share", { configurable: true, value: share });
    renderButton(<ShareProfileButton handle="ramesh_patil" fullName="Ramesh Patil" />);
    fireEvent.click(screen.getByRole("button", { name: "Share profile" }));

    await waitFor(() => expect(share).toHaveBeenCalledWith(expect.objectContaining({
      url: "http://localhost:3000/profile/ramesh_patil",
    })));
    expect(navigator.clipboard.writeText).not.toHaveBeenCalled();
  });
});
