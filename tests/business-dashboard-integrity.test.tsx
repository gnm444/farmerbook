import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BusinessDashboard } from "@/features/marketplace/business-dashboard";
import { profiles } from "@/lib/demo-data";
import { LocaleProvider } from "@/components/locale-provider";
import englishMessages from "@/lib/i18n/messages/en-IN";

function renderDashboard() {
  return render(
    <LocaleProvider locale="en-IN" messages={englishMessages}>
      <BusinessDashboard
        currentUser={profiles[0]}
        initialListings={[]}
        initialEnquiries={[]}
      />
    </LocaleProvider>,
  );
}

describe("business dashboard data integrity", () => {
  it("derives every visible metric from supplied records", () => {
    const { container } = renderDashboard();

    const availability = screen.getByText("Active availability").parentElement;
    expect(availability).not.toBeNull();
    expect(within(availability as HTMLElement).getByText("0")).toBeVisible();
    expect(screen.getByText("0 awaiting a response")).toBeVisible();
    expect(
      screen.getByText("Activity history will appear after buyers view your listings."),
    ).toBeVisible();
    expect(container.querySelector(".reach-chart")).not.toBeInTheDocument();
    expect(screen.queryByText("82%")).not.toBeInTheDocument();
    expect(screen.queryByText(/18%|61%/)).not.toBeInTheDocument();
  });

  it("labels seller-entered handling details as unverified declarations", () => {
    renderDashboard();

    fireEvent.click(screen.getByRole("button", { name: "Add produce listing" }));

    expect(
      screen.getByRole("group", { name: "Seller-declared handling details" }),
    ).toBeVisible();
    expect(
      screen.getByText(/not verified by FarmerBook/i),
    ).toBeVisible();
    expect(screen.queryByText("Verified farm")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Crop or produce")).toHaveAttribute(
      "list",
      "produce-category-suggestions",
    );
  });
});
