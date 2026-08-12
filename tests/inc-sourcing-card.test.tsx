import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LocaleProvider } from "@/components/locale-provider";
import { IncSourcingRequestCard } from "@/features/inc-sourcing/request-card";
import { demoIncSourcingRequests } from "@/lib/inc-sourcing-demo";
import englishMessages from "@/lib/i18n/messages/en-IN";
import hindiMessages from "@/lib/i18n/messages/hi-IN";

describe("Inc sourcing request card", () => {
  it("shows claim-specific verification without implying a guarantee", () => {
    render(<LocaleProvider locale="en-IN" messages={englishMessages}><IncSourcingRequestCard request={demoIncSourcingRequests[0]} detail /></LocaleProvider>);
    expect(screen.getByText("Verified Inc")).toBeVisible();
    expect(screen.getByText("Organization registration verified")).toBeVisible();
    expect(screen.getByText("Industry licence verified")).toBeVisible();
    expect(screen.getByText(/does not guarantee payment/i)).toBeVisible();
    expect(screen.queryByText(/receipt|evidence path/i)).not.toBeInTheDocument();
  });

  it("renders the core sourcing interface in Hindi", () => {
    render(<LocaleProvider locale="hi-IN" messages={hindiMessages}><IncSourcingRequestCard request={demoIncSourcingRequests[0]} /></LocaleProvider>);
    expect(screen.getByText("सत्यापित Inc")).toBeVisible();
    expect(screen.getByText("मात्रा")).toBeVisible();
    expect(screen.getByRole("link", { name: "सोर्सिंग अनुरोध देखें" })).toHaveAttribute("href", `/sourcing/${demoIncSourcingRequests[0].id}`);
  });
});
