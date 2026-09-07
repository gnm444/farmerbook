import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LocaleProvider } from "@/components/locale-provider";
import { ProfileCard } from "@/features/network/profile-card";
import { getProfile } from "@/lib/demo-data";
import { englishMessages, loadMessages } from "@/lib/i18n";

describe("ProfileCard", () => {
  it("shows farming context and invokes follow", () => {
    const onToggleFollow = vi.fn();
    render(
      <LocaleProvider locale="en-IN" messages={englishMessages}>
        <ProfileCard
          profile={getProfile("ramesh")}
          following={false}
          onToggleFollow={onToggleFollow}
        />
      </LocaleProvider>,
    );

    expect(screen.getByText("Ramesh Patil")).toBeInTheDocument();
    expect(screen.getByText(/Farmer/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Follow" }));
    expect(onToggleFollow).toHaveBeenCalledWith("ramesh");
  });

  it("localizes application-owned role and action labels", async () => {
    const messages = await loadMessages("te-IN");
    render(
      <LocaleProvider locale="te-IN" messages={messages}>
        <ProfileCard
          profile={getProfile("ramesh")}
          following={false}
          onToggleFollow={vi.fn()}
        />
      </LocaleProvider>,
    );

    expect(screen.getByText("రైతు")).toBeVisible();
    expect(screen.getByRole("button", { name: "అనుసరించండి" })).toBeVisible();
    expect(screen.getByRole("link", { name: "సందేశం" })).toBeVisible();
  });
});
