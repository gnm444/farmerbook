import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ChatPage, { metadata } from "@/app/chat/page";

vi.mock("@/components/locale-provider", () => ({
  useLocale: () => "en-IN",
}));

describe("chat canary page", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    Element.prototype.scrollIntoView = vi.fn();
  });

  it("is a focused, non-indexed public conversation surface", async () => {
    render(<ChatPage />);
    await act(async () => undefined);

    expect(screen.getByRole("heading", { level: 1, name: "FarmerBook Chat" }))
      .toBeInTheDocument();
    expect(screen.getByRole("link", { name: "FarmerBook home" }))
      .toHaveAttribute("href", "/");
    expect(screen.getByRole("region", { name: "FarmerBook greeter" }))
      .toBeInTheDocument();
    expect(screen.getByText("Protected Google canary")).toBeInTheDocument();
    expect(metadata.robots).toMatchObject({ index: false, follow: false });
  });
});
