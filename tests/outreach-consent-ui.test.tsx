import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
vi.mock("@/lib/cloudflare-bindings", () => ({
  getCloudflareBindings: vi.fn(async () => null),
}));
import { LocaleProvider } from "@/components/locale-provider";
import { ConsentJoinExperience } from "@/features/outreach/consent-join-experience";
import englishMessages from "@/lib/i18n/messages/en-IN";
import hindiMessages from "@/lib/i18n/messages/hi-IN";

const token = `${"a".repeat(80)}.${"b".repeat(43)}`;

describe("public consent-first join experience", () => {
  it("fails closed with an honest unavailable state when integrations are missing", () => {
    render(
      <LocaleProvider locale="en-IN" messages={englishMessages}>
        <ConsentJoinExperience
          configured={false}
          consentNonce=""
          turnstileSiteKey=""
          locales={["en-IN"]}
        />
      </LocaleProvider>,
    );
    expect(screen.getByRole("heading", { name: /consent service is being prepared/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /record my request/i })).not.toBeInTheDocument();
  });

  it("shows a Beta disclosure for every unreviewed locale fallback", () => {
    render(
      <LocaleProvider locale="hi-IN" messages={hindiMessages}>
        <ConsentJoinExperience
          configured={false}
          consentNonce=""
          turnstileSiteKey=""
          locales={["en-IN", "hi-IN"]}
        />
      </LocaleProvider>,
    );
    expect(screen.getByText(/इस आउटरीच अनुवाद की मूल-भाषी और कानूनी समीक्षा बाकी है/i)).toBeInTheDocument();
  });

  it("requires explicit consent and a Turnstile token before submission", () => {
    render(
      <LocaleProvider locale="en-IN" messages={englishMessages}>
        <ConsentJoinExperience
          configured
          consentNonce={token}
          turnstileSiteKey="site-key"
          locales={["en-IN", "hi-IN", "mr-IN"]}
        />
      </LocaleProvider>,
    );
    expect(screen.getByText(/public email or phone number is never treated as consent/i)).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: /send one verification and introduction/i })).toBeRequired();
    expect(screen.getByRole("button", { name: /record my request/i })).toBeDisabled();
    expect(
      screen.getByLabelText(/preferred language/i).querySelectorAll("option"),
    ).toHaveLength(3);
  });
});
