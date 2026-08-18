import type { MessageName } from "./messages";
import { DEFAULT_LOCALE, normalizeLocale } from "./locales";

export const ECO_SUPPLIER_SECTOR_MESSAGE_NAMES = Object.freeze({
  "solar-renewable-energy": "sectorSolarRenewableEnergy",
  "biodegradable-compostable-packaging": "sectorBiodegradablePackaging",
  "compost-bio-inputs": "sectorCompostBioInputs",
  "water-saving-irrigation-products": "sectorWaterSavingProducts",
  "reusable-repairable-farm-products": "sectorReusableRepairableProducts",
  "sustainable-clothing-textiles": "sectorSustainableClothingTextiles",
  "compostable-reusable-tableware": "sectorCompostableReusableTableware",
  "bamboo-products": "sectorBambooProducts",
  "farm-produce-value-added-products": "sectorFarmProduceValueAdded",
  "agricultural-residue-byproduct-products":
    "sectorAgriculturalResidueByproduct",
} as const satisfies Record<string, MessageName<"ecoSuppliers">>);

export type EcoSupplierSectorSlug =
  keyof typeof ECO_SUPPLIER_SECTOR_MESSAGE_NAMES;

export const ECO_SUPPLIER_ROLE_MESSAGE_NAMES = Object.freeze({
  manufacturer_brand: "roleManufacturerBrand",
  dealer_distributor: "roleDealerDistributor",
  both: "roleBoth",
} as const satisfies Record<string, MessageName<"ecoSuppliers">>);

export type EcoSupplierRole = keyof typeof ECO_SUPPLIER_ROLE_MESSAGE_NAMES;

export function ecoSupplierSectorMessageName(
  slug: string,
): MessageName<"ecoSuppliers"> | null {
  return Object.prototype.hasOwnProperty.call(
    ECO_SUPPLIER_SECTOR_MESSAGE_NAMES,
    slug,
  )
    ? ECO_SUPPLIER_SECTOR_MESSAGE_NAMES[slug as EcoSupplierSectorSlug]
    : null;
}

export function ecoSupplierRoleMessageName(
  role: string,
): MessageName<"ecoSuppliers"> | null {
  return Object.prototype.hasOwnProperty.call(
    ECO_SUPPLIER_ROLE_MESSAGE_NAMES,
    role,
  )
    ? ECO_SUPPLIER_ROLE_MESSAGE_NAMES[role as EcoSupplierRole]
    : null;
}

/**
 * Eco-supplier copy has not yet completed native-speaker review. Non-English
 * selections deliberately use the Indian-English source catalog rather than
 * presenting machine-authored text as reviewed translation.
 */
export function ecoSupplierUsesEnglishFallback(locale: unknown): boolean {
  return normalizeLocale(locale) !== DEFAULT_LOCALE;
}

export function ecoSupplierFallbackLanguageProps(locale: unknown) {
  return ecoSupplierUsesEnglishFallback(locale)
    ? ({ lang: DEFAULT_LOCALE, dir: "ltr" } as const)
    : ({} as const);
}
