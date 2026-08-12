import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ReportTargetButton } from "@/features/moderation/report-target-button";
import { reportSchema } from "@/features/moderation/schemas";
import { LocaleProvider } from "@/components/locale-provider";
import englishMessages from "@/lib/i18n/messages/en-IN";

const mocks = vi.hoisted(() => ({
  createReportAction: vi.fn(async () => ({ ok: true as const, demo: false })),
}));
vi.mock("@/features/moderation/actions", () => ({
  createReportAction: mocks.createReportAction,
}));

describe("ecosystem report control", () => {
  it.each([
    "organization",
    "business_offer",
    "produce_listing",
    "certification_claim",
  ] as const)("accepts the %s moderation target", (targetType) => {
    expect(
      reportSchema.safeParse({
        targetType,
        targetId: "target-1",
        reason: "unsafe",
        details: "Requires moderator review.",
      }).success,
    ).toBe(true);
  });

  it("submits a bounded report and confirms receipt", async () => {
    render(
      <LocaleProvider locale="en-IN" messages={englishMessages}>
        <ReportTargetButton
          targetType="business_offer"
          targetId="offer-1"
          label="offer"
        />
      </LocaleProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Report offer" }));
    fireEvent.change(screen.getByLabelText(/details for the moderator/i), {
      target: { value: "The safety claim needs review." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send report" }));

    await waitFor(() => expect(mocks.createReportAction).toHaveBeenCalledWith({
      targetType: "business_offer",
      targetId: "offer-1",
      reason: "unsafe",
      details: "The safety claim needs review.",
    }));
    expect(await screen.findByRole("status")).toHaveTextContent(/report sent/i);
  });
});
