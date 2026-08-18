import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LocaleProvider } from "@/components/locale-provider";
import { EcoProductApplicationForm } from "@/features/eco-products/eco-product-application-form";
import { buildEcoProductApplicationEmail } from "@/features/eco-products/application-email";
import { ecoProductIntakeSchema } from "@/features/eco-products/intake-schema";
import englishMessages from "@/lib/i18n/messages/en-IN";

const validApplication = {
  businessRole: "dealer_distributor" as const,
  organizationName: "Deccan Circular Products",
  representativeName: "Anita Rao",
  email: "anita@example.test",
  phone: "+91 98765 43210",
  location: "Hyderabad, Telangana",
  websiteUrl: "https://example.test",
  categorySlugs: [
    "compostable-reusable-tableware" as const,
    "agricultural-residue-byproduct-products" as const,
  ],
  productName: "Bagasse plates and reusable serving trays",
  productDescription:
    "Plates made from sugarcane bagasse and washable trays for repeated food service use.",
  environmentalClaims:
    "The plates are described by the seller as compostable under a named standard.",
  evidenceLinks: "https://example.test/test-report",
  consent: true as const,
};

function renderForm() {
  return render(
    <LocaleProvider locale="en-IN" messages={englishMessages}>
      <EcoProductApplicationForm />
    </LocaleProvider>,
  );
}

describe("public eco-product supplier intake", () => {
  it("keeps manufacturers and distributors explicit and validates concrete categories", () => {
    expect(ecoProductIntakeSchema.parse(validApplication)).toMatchObject({
      businessRole: "dealer_distributor",
      categorySlugs: [
        "compostable-reusable-tableware",
        "agricultural-residue-byproduct-products",
      ],
    });
    expect(
      ecoProductIntakeSchema.safeParse({
        ...validApplication,
        businessRole: "retailer",
      }).success,
    ).toBe(false);
    expect(
      ecoProductIntakeSchema.safeParse({
        ...validApplication,
        productDescription:
          "Disposable biodegradable plastic plates for one-time food service use.",
        environmentalClaims: "Biodegradable plastic tableware",
      }).success,
    ).toBe(false);
    expect(
      ecoProductIntakeSchema.safeParse({
        ...validApplication,
        environmentalClaims: "CPCB-certified compostable plastic plates",
        evidenceLinks: "",
      }).success,
    ).toBe(false);
    expect(
      ecoProductIntakeSchema.safeParse({
        ...validApplication,
        environmentalClaims: "CPCB-certified compostable plastic plates",
      }).success,
    ).toBe(true);
    expect(
      ecoProductIntakeSchema.safeParse({
        ...validApplication,
        categorySlugs: [],
      }).success,
    ).toBe(false);
  });

  it("prepares a transparent application to the official FarmerBook address", () => {
    const email = buildEcoProductApplicationEmail(validApplication);

    expect(email.recipient).toBe("ceo@farmerbook.in");
    expect(email.subject).toContain("Deccan Circular Products");
    expect(email.summary).toContain("Business role: Distributor");
    expect(email.summary).toContain("Compostable or reusable plates and tableware");
    expect(email.summary).toContain("Seller-described environmental claims:");
    expect(email.summary).toContain(
      "selecting an eco-friendly category does not create a certification",
    );
    expect(email.claimAssessment.status).toBe("evidence_submitted");
    expect(email.claimAssessment.claimTextPublishable).toBe(false);
    expect(email.evidenceState).toBe("provided_not_received");
    expect(email.summary).toContain(
      "Environmental evidence submitted — review pending",
    );
    expect(email.summary).toContain("trusted reviewer records a decision");
    expect(email.href).toMatch(/^mailto:ceo@farmerbook\.in\?/);
  });

  it("offers all requested supplier categories and a working email handoff", () => {
    renderForm();

    expect(screen.getByRole("radio", { name: "Manufacturer or brand" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Dealer or distributor" })).toBeVisible();
    expect(screen.getByRole("radio", { name: "Manufacturer and distributor" })).toBeVisible();
    expect(screen.getByRole("checkbox", { name: "Sustainable clothing and textiles" })).toBeVisible();
    expect(screen.getByRole("checkbox", { name: "Compostable and reusable tableware" })).toBeVisible();
    expect(screen.getByRole("checkbox", { name: "Bamboo products" })).toBeVisible();
    expect(screen.getByRole("checkbox", { name: "Farm-produce and value-added products" })).toBeVisible();
    expect(screen.getByRole("checkbox", { name: "Agricultural-residue and by-product products" })).toBeVisible();

    fireEvent.change(screen.getByLabelText("Business name"), {
      target: { value: validApplication.organizationName },
    });
    fireEvent.change(screen.getByLabelText("Contact person"), {
      target: { value: validApplication.representativeName },
    });
    fireEvent.change(screen.getByLabelText("Business email"), {
      target: { value: validApplication.email },
    });
    fireEvent.change(screen.getByLabelText("City, district and state"), {
      target: { value: validApplication.location },
    });
    fireEvent.click(
      screen.getByRole("checkbox", { name: "Compostable and reusable tableware" }),
    );
    fireEvent.change(screen.getByLabelText("Product or product range"), {
      target: { value: validApplication.productName },
    });
    fireEvent.change(
      screen.getByLabelText("What the product is made from and how it is used"),
      { target: { value: validApplication.productDescription } },
    );
    fireEvent.click(screen.getByRole("checkbox", { name: /I confirm that I am authorized/i }));
    fireEvent.click(screen.getByRole("button", { name: "Prepare email to FarmerBook" }));

    expect(screen.getByRole("link", { name: "Open prepared email" })).toHaveAttribute(
      "href",
      expect.stringMatching(/^mailto:ceo@farmerbook\.in\?/),
    );
    expect(
      screen.getByText(
        "Seller-declared environmental claim — not independently verified",
      ),
    ).toBeVisible();
    expect(
      screen.getByText("Evidence state: no evidence references supplied"),
    ).toBeVisible();
    expect(
      (screen.getByRole("textbox", {
        name: "Copy submission summary",
      }) as HTMLTextAreaElement).value,
    ).toContain("Deccan Circular Products");
  });
});
