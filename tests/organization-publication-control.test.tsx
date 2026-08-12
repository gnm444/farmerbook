import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { OrganizationForMember } from "@/features/organizations/types";
import { LocaleProvider } from "@/components/locale-provider";
import englishMessages from "@/lib/i18n/messages/en-IN";

const { publicationAction, refresh } = vi.hoisted(() => ({
  publicationAction: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));
vi.mock("@/features/organizations/actions", () => ({
  setOrganizationPublicationAction: publicationAction,
}));

import { OrganizationPublicationControl } from "@/features/organizations/organization-publication-control";

const organization: OrganizationForMember = {
  id: "2cb71437-cdf0-4551-a853-2617c8e76cc2",
  slug: "sahyadri-farm-tools",
  displayName: "Sahyadri Farm Tools",
  organizationType: "dealer_distributor",
  description:
    "Farm implements, spare parts and repair support for growers in Maharashtra.",
  state: "Maharashtra",
  district: "Pune",
  sectorSlugs: ["farm-tools-implements"],
  serviceAreas: [{ state: "Maharashtra", district: "Pune" }],
  publicationState: "draft",
  verificationState: "unverified",
  moderationState: "active",
  createdAt: "2026-08-09T00:00:00Z",
  updatedAt: "2026-08-09T00:00:00Z",
  membershipRole: "owner",
};

function renderControl(value: OrganizationForMember) {
  return render(
    <LocaleProvider locale="en-IN" messages={englishMessages}>
      <OrganizationPublicationControl organization={value} />
    </LocaleProvider>,
  );
}

describe("organization publication control", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    publicationAction.mockResolvedValue({
      ok: true,
      code: "PUBLICATION_UPDATED",
      data: {
        organizationId: organization.id,
        slug: organization.slug,
        publicationState: "published",
        updatedAt: "2026-08-09T00:01:00Z",
      },
    });
  });

  it("offers an accessible publish action to an owner", async () => {
    renderControl(organization);

    fireEvent.click(
      screen.getByRole("button", { name: "Publish Sahyadri Farm Tools" }),
    );

    await waitFor(() => {
      expect(publicationAction).toHaveBeenCalledWith({
        organizationId: organization.id,
        publicationState: "published",
        expectedUpdatedAt: organization.updatedAt,
      });
    });
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Inc profile published.",
    );
    expect(refresh).toHaveBeenCalledOnce();
  });

  it("does not render publication controls for an editor", () => {
    const { container } = renderControl({ ...organization, membershipRole: "editor" });

    expect(container).toBeEmptyDOMElement();
  });

  it("blocks publication when required public data or moderation is missing", () => {
    renderControl({
          ...organization,
          moderationState: "restricted",
          sectorSlugs: [],
          serviceAreas: [],
        });

    const button = screen.getByRole("button", {
      name: "Publish Sahyadri Farm Tools",
    });
    expect(button).toBeDisabled();
    expect(screen.getByRole("status")).toHaveTextContent(
      /moderation must be active.*Inc sector.*service area/i,
    );
    expect(publicationAction).not.toHaveBeenCalled();
  });

  it("lets an active admin remove a company from public discovery", async () => {
    publicationAction.mockResolvedValue({
      ok: true,
      code: "PUBLICATION_UPDATED",
      data: {
        organizationId: organization.id,
        slug: organization.slug,
        publicationState: "unpublished",
        updatedAt: "2026-08-09T00:02:00Z",
      },
    });
    renderControl({
          ...organization,
          publicationState: "published",
          membershipRole: "admin",
        });

    fireEvent.click(
      screen.getByRole("button", { name: "Unpublish Sahyadri Farm Tools" }),
    );

    await waitFor(() => {
      expect(publicationAction).toHaveBeenCalledWith({
        organizationId: organization.id,
        publicationState: "unpublished",
        expectedUpdatedAt: organization.updatedAt,
      });
    });
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Inc profile removed from public discovery.",
    );
  });
});
