import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LocaleProvider } from "@/components/locale-provider";
import { OnboardingFlow } from "@/features/onboarding/onboarding-flow";
import type { OnboardingProgressRecord } from "@/features/onboarding/types";
import {
  englishMessages,
  loadMessages,
  type Messages,
  type SupportedLocale,
} from "@/lib/i18n";
import type { FarmerProfile } from "@/lib/types";

const actionMocks = vi.hoisted(() => ({
  save: vi.fn(),
  finalize: vi.fn(),
}));

const routerMocks = vi.hoisted(() => ({
  push: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("@/features/onboarding/actions", () => ({
  saveOnboardingStepAction: actionMocks.save,
  finalizeOnboardingAction: actionMocks.finalize,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => routerMocks,
}));

const profile = {
  id: "00000000-0000-4000-8000-000000000010",
  handle: "meera",
  fullName: "Meera Patil",
  initials: "MP",
  participantType: "farmer",
  accountRole: "farmer",
  roleLabel: "Farmer",
  preferredLocale: "en-IN",
  categoryAffinities: [],
  district: "Nashik",
  state: "Maharashtra",
  crops: [],
  bio: "Grape farmer",
  farmingMethod: "natural",
  socialLinks: {},
  reviewSummary: { average: 0, count: 0 },
  verified: false,
  followers: 0,
  following: 0,
  experienceYears: 8,
  joinedLabel: "Joined 2026",
  publicProfileEnabled: false,
} satisfies FarmerProfile;

function progress(
  overrides: Partial<OnboardingProgressRecord> = {},
): OnboardingProgressRecord {
  return {
    flowVersion: 1,
    revision: 1,
    locale: "en-IN",
    accountRole: null,
    currentStep: "role",
    completedSteps: ["language"],
    selectedCategorySlugs: [],
    customCategoryLabels: [],
    companySectorSlugs: [],
    status: "not_started",
    ...overrides,
  };
}

function renderFlow(
  initialProgress: OnboardingProgressRecord,
  {
    agriBusinessesEnabled = true,
    extendedLocalesEnabled = true,
    locale = "en-IN",
    messages = englishMessages,
  }: {
    agriBusinessesEnabled?: boolean;
    extendedLocalesEnabled?: boolean;
    locale?: SupportedLocale;
    messages?: Messages;
  } = {},
) {
  return render(
    <LocaleProvider locale={locale} messages={messages}>
      <OnboardingFlow
        initialProfile={profile}
        initialProgress={initialProgress}
        agriBusinessesEnabled={agriBusinessesEnabled}
        extendedLocalesEnabled={extendedLocalesEnabled}
      />
    </LocaleProvider>,
  );
}

describe("six-step onboarding flow", () => {
  beforeEach(() => {
    actionMocks.save.mockReset();
    actionMocks.finalize.mockReset();
    routerMocks.push.mockReset();
    routerMocks.refresh.mockReset();
  });

  it("does not preselect a role for a new participant", () => {
    renderFlow(progress());

    const roleGroup = screen.getByRole("group", {
      name: "How will you use FarmerBook?",
    });
    const radios = within(roleGroup).getAllByRole("radio");
    expect(radios).toHaveLength(4);
    for (const radio of radios) expect(radio).not.toBeChecked();
    expect(screen.getByText("Step 2 of 6")).toBeVisible();
  });

  it("restores the saved step and role with a resume notice", () => {
    renderFlow(
      progress({
        revision: 7,
        accountRole: "wholesaler",
        status: "in_progress",
      }),
    );

    expect(
      screen.getByRole("radio", { name: /Wholesaler or trader/ }),
    ).toBeChecked();
    expect(screen.getByRole("status")).toHaveTextContent(
      "Your saved progress is ready to continue.",
    );
    expect(screen.getByText("Step 2 of 6")).toBeVisible();
  });

  it("submits the explicit role and advances using returned progress", async () => {
    actionMocks.save.mockResolvedValue({
      ok: true,
      code: "SAVED",
      revision: 2,
      data: progress({
        revision: 2,
        accountRole: "farmer",
        currentStep: "identity_location",
        completedSteps: ["language", "role"],
        status: "in_progress",
      }),
    });
    renderFlow(progress());

    fireEvent.click(screen.getByRole("radio", { name: /Farmer or producer/ }));
    fireEvent.click(screen.getByRole("button", { name: /Continue/ }));

    await waitFor(() => {
      expect(actionMocks.save).toHaveBeenCalledWith(
        expect.objectContaining({
          flowVersion: 1,
          expectedRevision: 1,
          step: "role",
          data: { accountRole: "farmer" },
        }),
      );
      expect(screen.getByText("Identity and location")).toBeVisible();
    });
    expect(screen.getByRole("status")).toHaveTextContent("Progress saved");
    expect(screen.getByText("Step 3 of 6")).toBeVisible();
  });

  it("keeps an unselected role explicit and validates before the server", async () => {
    renderFlow(progress());

    fireEvent.click(screen.getByRole("button", { name: /Continue/ }));

    await waitFor(() => {
      expect(actionMocks.save).not.toHaveBeenCalled();
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Check the highlighted information",
      );
    });
    for (const radio of screen.getAllByRole("radio")) {
      expect(radio).not.toBeChecked();
    }
  });

  it("shows review state for locale options without marking English beta", () => {
    renderFlow(
      progress({
        revision: 0,
        currentStep: "language",
        completedSteps: [],
      }),
    );

    const localeSelect = screen.getByLabelText("Language");
    expect(
      within(localeSelect).getByRole("option", { name: "English — English" }),
    ).not.toHaveTextContent("Beta");
    expect(
      within(localeSelect).getByRole("option", {
        name: "हिन्दी — Hindi (Beta)",
      }),
    ).toBeVisible();

    fireEvent.change(localeSelect, { target: { value: "hi-IN" } });
    expect(
      screen.getByText(/Beta: this translation awaits native-speaker review/i),
    ).toBeVisible();
  });

  it("hides agricultural business when that rollout is disabled", () => {
    renderFlow(progress(), { agriBusinessesEnabled: false });

    expect(screen.getAllByRole("radio")).toHaveLength(3);
    expect(
      screen.queryByRole("radio", { name: /Agricultural company/ }),
    ).not.toBeInTheDocument();
  });

  it("limits locale rollout while retaining a previously saved locale", () => {
    renderFlow(
      progress({
        locale: "ur-IN",
        currentStep: "language",
        completedSteps: [],
      }),
      { extendedLocalesEnabled: false },
    );

    const options = within(screen.getByLabelText("Language")).getAllByRole(
      "option",
    );
    expect(options.map((option) => option.getAttribute("value"))).toEqual([
      "en-IN",
      "hi-IN",
      "mr-IN",
      "ur-IN",
    ]);
  });

  it("renders native base copy and a visible Beta fallback disclosure", async () => {
    const messages = await loadMessages("hi-IN");
    renderFlow(progress({ locale: "hi-IN" }), {
      locale: "hi-IN",
      messages,
    });

    expect(
      screen.getByRole("group", {
        name: "आप फार्मरबुक का उपयोग कैसे करेंगे?",
      }),
    ).toBeVisible();
    expect(screen.getByText(/बीटा: इस अनुवाद की मूल-भाषी समीक्षा बाकी है।/i)).toBeVisible();
  });
});
