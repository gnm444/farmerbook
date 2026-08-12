import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ProfileCard } from "@/features/network/profile-card";
import { getProfile } from "@/lib/demo-data";

describe("ProfileCard", () => {
  it("shows farming context and invokes follow", () => {
    const onToggleFollow = vi.fn();
    render(
      <ProfileCard
        profile={getProfile("ramesh")}
        following={false}
        onToggleFollow={onToggleFollow}
      />,
    );

    expect(screen.getByText("Ramesh Patil")).toBeInTheDocument();
    expect(screen.getByText(/Farmer/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Follow" }));
    expect(onToggleFollow).toHaveBeenCalledWith("ramesh");
  });
});
