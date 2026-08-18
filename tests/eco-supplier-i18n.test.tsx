import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LocaleProvider } from "@/components/locale-provider";
import { EcoProductApplicationForm } from "@/features/eco-products/eco-product-application-form";
import { CompanySectorOptions } from "@/features/organizations/company-sector-options";
import { EcoFriendlyClaimNotice } from "@/features/organizations/eco-friendly-claim-notice";
import urduMessages from "@/lib/i18n/messages/ur-IN";
import {
  ECO_SUPPLIER_ROLE_MESSAGE_NAMES,
  ECO_SUPPLIER_SECTOR_MESSAGE_NAMES,
  SUPPORTED_LOCALES,
  ecoSupplierFallbackLanguageProps,
  ecoSupplierRoleMessageName,
  ecoSupplierSectorMessageName,
  ecoSupplierUsesEnglishFallback,
  englishMessages,
  loadMessages,
  messageFor,
} from "@/lib/i18n";

describe("eco-supplier localization", () => {
  it("uses a complete, explicit Indian-English fallback in every unreviewed catalog", async () => {
    for (const locale of SUPPORTED_LOCALES) {
      const messages = await loadMessages(locale);
      expect(Object.keys(messages.ecoSuppliers), locale).toEqual(
        Object.keys(englishMessages.ecoSuppliers),
      );

      if (locale !== "en-IN") {
        expect(messages.ecoSuppliers, locale).toEqual(
          englishMessages.ecoSuppliers,
        );
        expect(ecoSupplierUsesEnglishFallback(locale), locale).toBe(true);
        expect(ecoSupplierFallbackLanguageProps(locale), locale).toEqual({
          lang: "en-IN",
          dir: "ltr",
        });
      }

      for (const name of Object.values(ECO_SUPPLIER_ROLE_MESSAGE_NAMES)) {
        expect(
          messageFor(messages, `ecoSuppliers.${name}`),
          `${locale}:${name}`,
        ).not.toBe("");
      }
      for (const name of Object.values(ECO_SUPPLIER_SECTOR_MESSAGE_NAMES)) {
        expect(
          messageFor(messages, `ecoSuppliers.${name}`),
          `${locale}:${name}`,
        ).not.toBe("");
      }
    }

    expect(ecoSupplierUsesEnglishFallback("en-IN")).toBe(false);
    expect(ecoSupplierFallbackLanguageProps("en-IN")).toEqual({});
  });

  it("maps every public intake role and eco category to a typed message", () => {
    expect(ecoSupplierRoleMessageName("manufacturer_brand")).toBe(
      "roleManufacturerBrand",
    );
    expect(ecoSupplierRoleMessageName("dealer_distributor")).toBe(
      "roleDealerDistributor",
    );
    expect(ecoSupplierRoleMessageName("both")).toBe("roleBoth");
    expect(ecoSupplierRoleMessageName("unknown")).toBeNull();

    expect(Object.keys(ECO_SUPPLIER_SECTOR_MESSAGE_NAMES)).toHaveLength(10);
    expect(ecoSupplierSectorMessageName("bamboo-products")).toBe(
      "sectorBambooProducts",
    );
    expect(
      ecoSupplierSectorMessageName(
        "agricultural-residue-byproduct-products",
      ),
    ).toBe("sectorAgriculturalResidueByproduct");
    expect(ecoSupplierSectorMessageName("unknown")).toBeNull();
  });

  it("exposes accessible labels and fallback language metadata in RTL UI", () => {
    render(
      <LocaleProvider locale="ur-IN" messages={urduMessages}>
        <select aria-label="Supplier categories" multiple>
          <CompanySectorOptions />
        </select>
        <EcoFriendlyClaimNotice alwaysVisible />
      </LocaleProvider>,
    );

    const ecoGroup = screen.getByRole("group", {
      name: "Eco-friendly products — seller-declared",
    });
    expect(ecoGroup).toHaveAttribute("lang", "en-IN");
    expect(ecoGroup).toHaveAttribute("dir", "ltr");
    expect(
      screen.queryByRole("option", { name: "Manufacturer or brand" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("option", {
        name: "Biodegradable and compostable packaging",
      }),
    ).toBeVisible();

    const disclosure = screen.getByRole("complementary", {
      name: "Eco-friendly claim disclosure",
    });
    expect(disclosure).toHaveAttribute("lang", "en-IN");
    expect(disclosure).toHaveAttribute("dir", "ltr");
  });

  it("keeps the public intake usable when an RTL language is selected", () => {
    render(
      <LocaleProvider locale="ur-IN" messages={urduMessages}>
        <EcoProductApplicationForm />
      </LocaleProvider>,
    );

    const form = screen.getByRole("form", {
      name: "Eco-friendly supplier onboarding",
    });
    expect(form).toHaveAttribute("lang", "en-IN");
    expect(form).toHaveAttribute("dir", "ltr");
    expect(
      screen.getByText(/currently shown in Indian English/i),
    ).toBeVisible();
    expect(
      screen.getByRole("radio", { name: "Manufacturer or brand" }),
    ).toBeVisible();
    expect(
      screen.getByRole("radio", { name: "Dealer or distributor" }),
    ).toBeVisible();
    expect(
      screen.getByRole("checkbox", { name: "Bamboo products" }),
    ).toBeVisible();
  });
});
