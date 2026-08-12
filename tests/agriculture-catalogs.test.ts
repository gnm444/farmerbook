import { describe, expect, it } from "vitest";
import {
  AGRICULTURE_CATEGORIES,
  SELECTABLE_AGRICULTURE_CATEGORIES,
  agricultureCategoriesForContext,
  agricultureCategoryByLabel,
  agricultureCategoryBySlug,
  agricultureSelectionFromLabels,
} from "@/lib/agriculture/categories";
import {
  AGRICULTURE_COMPANY_SECTORS,
  agricultureCompanySectorBySlug,
} from "@/lib/agriculture/company-sectors";
import {
  ECOSYSTEM_ACCOUNT_ROLES,
  ONBOARDING_STEPS,
} from "@/features/onboarding/types";
import {
  canManageOrganization,
  canPublishProduce,
  canRespondToOrganizationEnquiries,
  canSource,
  hasAgricultureCapability,
} from "@/features/auth/capabilities";
import { SUPPORTED_LOCALES } from "@/lib/i18n/locales";

const FOUNDATION_CATEGORY_SLUGS = [
  "crop-cultivation", "horticulture", "livestock", "poultry",
  "fisheries-aquaculture", "allied-activities", "cereals-grains",
  "pulses-legumes", "oilseeds", "commercial-field-crops", "fodder-forage",
  "fruit-orchards", "vegetables", "spices-condiments",
  "flowers-floriculture", "medicinal-aromatic-plants", "plantation-crops",
  "nursery-seed-production", "protected-cultivation", "hydroponics",
  "aquaponics", "vertical-urban-farming", "mushroom-cultivation",
  "dairy-cattle", "buffalo-farming", "goat-farming", "sheep-farming",
  "pig-farming", "rabbit-farming", "other-livestock", "broiler-chicken",
  "layer-egg-production", "backyard-native-poultry", "duck-farming",
  "turkey-farming", "quail-farming", "poultry-hatchery",
  "freshwater-aquaculture", "brackish-water-aquaculture",
  "marine-aquaculture", "inland-capture-fisheries",
  "marine-capture-fisheries", "shrimp-prawn", "crab-lobster",
  "molluscs-shellfish", "pearl-culture", "seaweed-farming",
  "ornamental-fish", "fish-hatchery-seed", "beekeeping-apiculture",
  "sericulture", "lac-cultivation", "agroforestry", "vermicompost-compost",
  "on-farm-processing", "integrated-farming", "rice", "wheat", "maize",
  "sorghum-jowar", "pearl-millet-bajra", "finger-millet-ragi",
  "other-millets", "chickpea-gram", "pigeon-pea-tur", "lentil",
  "mung-bean", "urad-bean", "groundnut", "mustard-rapeseed", "soybean",
  "sesame", "sunflower", "cotton", "jute", "sugarcane", "mango",
  "banana", "grapes", "pomegranate", "citrus", "apple-temperate-fruit",
  "tomato", "onion", "potato-root-tubers", "okra", "leafy-vegetables",
  "tea", "coffee", "coconut", "rubber",
] as const;

describe("agriculture ecosystem catalogs", () => {
  it("ships a unique, connected and broad agriculture hierarchy", () => {
    const slugs = AGRICULTURE_CATEGORIES.map((category) => category.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(AGRICULTURE_CATEGORIES.length).toBeGreaterThanOrEqual(300);
    expect(SELECTABLE_AGRICULTURE_CATEGORIES.length).toBeGreaterThanOrEqual(300);

    for (const category of AGRICULTURE_CATEGORIES) {
      if ("parentSlug" in category) {
        expect(slugs).toContain(category.parentSlug);
        expect(category.parentSlug).not.toBe(category.slug);
      }
      if (category.kind === "group") expect(category.selectable).toBe(false);
      expect(category.translationKey).toBe(
        `agricultureCategories.${category.slug}`,
      );
      expect(category.contexts.length).toBeGreaterThan(0);
      expect(["farming_activity", "commodity"]).toContain(category.domain);
      expect(category.sortOrder).toBeGreaterThan(0);
    }
  });

  it("preserves every foundation taxonomy slug", () => {
    expect(FOUNDATION_CATEGORY_SLUGS).toHaveLength(91);
    const currentSlugs = new Set(
      AGRICULTURE_CATEGORIES.map((category) => category.slug),
    );
    for (const slug of FOUNDATION_CATEGORY_SLUGS) {
      expect(currentSlugs.has(slug), `missing foundation category ${slug}`).toBe(true);
    }
  });

  it("covers produce, livestock products and regional-name aliases", () => {
    for (const slug of [
      "tomato", "mango", "leafy-vegetables", "milk", "cow-milk",
      "farm-dairy-products", "meat", "eggs", "chicken-meat", "rohu",
      "shrimp-prawn", "honey", "mushroom-cultivation", "jaggery",
    ]) {
      expect(agricultureCategoryBySlug(slug)?.selectable).toBe(true);
    }

    expect(agricultureCategoryByLabel("bhindi")?.slug).toBe("okra");
    expect(agricultureCategoryByLabel("kanda")?.slug).toBe("onion");
    expect(agricultureCategoryByLabel("doodh")?.slug).toBe("milk");
    expect(agricultureCategoryByLabel("millets")?.slug).toBe("other-millets");
    expect(
      agricultureCategoriesForContext("produce").some(
        (category) => category.slug === "chicken-meat",
      ),
    ).toBe(false);
    expect(
      agricultureCategoriesForContext("sourcing").some(
        (category) => category.slug === "chicken-meat",
      ),
    ).toBe(true);

    expect(agricultureSelectionFromLabels(["Tomato", "kanda", "Rare forest tuber"]))
      .toEqual({
        selectedSlugs: ["tomato", "onion"],
        customLabels: ["Rare forest tuber"],
      });
  });

  it("distinguishes poultry, aquaculture, seafood and allied activities", () => {
    for (const slug of [
      "layer-egg-production",
      "backyard-native-poultry",
      "freshwater-aquaculture",
      "marine-aquaculture",
      "marine-capture-fisheries",
      "shrimp-prawn",
      "molluscs-shellfish",
      "seaweed-farming",
      "beekeeping-apiculture",
      "sericulture",
      "agroforestry",
      "integrated-farming",
    ]) {
      expect(agricultureCategoryBySlug(slug)?.selectable).toBe(true);
    }
  });

  it("covers the companies farmers need to buy from and work with", () => {
    const slugs = AGRICULTURE_COMPANY_SECTORS.map((sector) => sector.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(AGRICULTURE_COMPANY_SECTORS.length).toBeGreaterThanOrEqual(25);

    for (const sector of AGRICULTURE_COMPANY_SECTORS) {
      expect(sector.domain).toBe("business_sector");
      expect(sector.translationKey).toBe(
        `agriculture.companySectors.${sector.slug}`,
      );
      expect(sector.selectable).toBe(true);
      expect(sector.sortOrder).toBeGreaterThan(0);
    }

    for (const slug of [
      "tractors-power-equipment",
      "farm-tools-implements",
      "equipment-rental-custom-hiring",
      "seeds-planting-material",
      "aquaculture-inputs-equipment",
      "storage-warehousing-cold-chain",
      "transport-logistics",
      "finance-credit-payments",
      "agronomy-advisory",
    ]) {
      expect(agricultureCompanySectorBySlug(slug)).toBeDefined();
    }
  });

  it("defines 22 scheduled Indian languages plus English", () => {
    expect(SUPPORTED_LOCALES).toEqual([
      "en-IN", "as-IN", "bn-IN", "brx-IN", "doi-IN", "gu-IN", "hi-IN",
      "kn-IN", "ks-Arab-IN", "kok-Deva-IN", "mai-IN", "ml-IN",
      "mni-Mtei-IN", "mr-IN", "ne-IN", "or-IN", "pa-Guru-IN", "sa-IN",
      "sat-Olck-IN", "sd-Arab-IN", "ta-IN", "te-IN", "ur-IN",
    ]);
    expect(new Set(SUPPORTED_LOCALES).size).toBe(23);
  });

  it("defines the exact language-first six-step onboarding flow", () => {
    expect(ONBOARDING_STEPS).toEqual([
      "language",
      "role",
      "identity_location",
      "agriculture",
      "role_details",
      "review_visibility",
    ]);
  });

  it("keeps produce publishing compatible with Farmers and Wholesalers", () => {
    expect(ECOSYSTEM_ACCOUNT_ROLES).toContain("agri_business");
    expect(canPublishProduce("farmer")).toBe(true);
    expect(canPublishProduce("wholesaler")).toBe(true);
    expect(canPublishProduce("customer")).toBe(false);
    expect(canPublishProduce("agri_business")).toBe(false);
    expect(
      hasAgricultureCapability("agri_business", "publish_business_offers"),
    ).toBe(true);
    for (const role of ECOSYSTEM_ACCOUNT_ROLES) expect(canSource(role)).toBe(true);

    expect(canManageOrganization("owner")).toBe(true);
    expect(canManageOrganization("admin")).toBe(true);
    expect(canManageOrganization("editor")).toBe(true);
    expect(canManageOrganization("enquiry_agent")).toBe(false);
    expect(canManageOrganization("viewer")).toBe(false);

    expect(canRespondToOrganizationEnquiries("owner")).toBe(true);
    expect(canRespondToOrganizationEnquiries("admin")).toBe(true);
    expect(canRespondToOrganizationEnquiries("enquiry_agent")).toBe(true);
    expect(canRespondToOrganizationEnquiries("editor")).toBe(false);
    expect(canRespondToOrganizationEnquiries("viewer")).toBe(false);
  });
});
