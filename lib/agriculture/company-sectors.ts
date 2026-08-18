export type AgricultureCompanySectorGroup =
  | "machinery"
  | "eco-friendly-products"
  | "inputs"
  | "animal-aquaculture"
  | "supply-chain"
  | "professional-services"
  | "markets"
  | "farmer-dependent-industries";

export type AgricultureCompanySector = {
  slug: string;
  name: string;
  group: AgricultureCompanySectorGroup;
  domain: "business_sector";
  translationKey: `agriculture.companySectors.${string}`;
  selectable: true;
  sortOrder: number;
  requiresHumanReview: boolean;
  offerExamples: readonly string[];
};

type AgricultureCompanySectorDefinition = Omit<
  AgricultureCompanySector,
  "domain" | "translationKey" | "selectable" | "sortOrder" | "requiresHumanReview"
> & {
  requiresHumanReview?: boolean;
};

const AGRICULTURE_COMPANY_SECTOR_DEFINITIONS = [
  { slug: "tractors-power-equipment", name: "Tractors and power equipment", group: "machinery", offerExamples: ["Tractor sales", "Power tillers", "Service plans"] },
  { slug: "harvesters-field-machinery", name: "Harvesters and field machinery", group: "machinery", offerExamples: ["Harvesters", "Seed drills", "Threshers"] },
  { slug: "farm-tools-implements", name: "Farm tools and implements", group: "machinery", offerExamples: ["Hand tools", "Implements", "Spare parts"] },
  { slug: "equipment-rental-custom-hiring", name: "Equipment rental and custom hiring", group: "machinery", offerExamples: ["Hourly rental", "Operator service", "Seasonal packages"] },
  { slug: "irrigation-pumps", name: "Irrigation systems and pumps", group: "machinery", offerExamples: ["Drip systems", "Sprinklers", "Water pumps"] },
  { slug: "solar-renewable-energy", name: "Solar and renewable farm energy", group: "eco-friendly-products", offerExamples: ["Solar pumps", "Farm solar", "Biogas systems"] },
  { slug: "biodegradable-compostable-packaging", name: "Biodegradable and compostable packaging", group: "eco-friendly-products", offerExamples: ["Compostable produce bags", "Biodegradable nursery pots", "Agri-residue packaging"] },
  { slug: "compost-bio-inputs", name: "Compost and biological farm inputs", group: "eco-friendly-products", offerExamples: ["Compost", "Vermicompost", "Biofertilizers"] },
  { slug: "water-saving-irrigation-products", name: "Water-saving irrigation and farm products", group: "eco-friendly-products", offerExamples: ["Drip irrigation", "Moisture sensors", "Rainwater-harvesting products"] },
  { slug: "reusable-repairable-farm-products", name: "Reusable and repairable farm products", group: "eco-friendly-products", offerExamples: ["Reusable crates", "Repairable hand tools", "Refillable farm containers"] },
  { slug: "sustainable-clothing-textiles", name: "Sustainable clothing and natural-fibre textiles", group: "eco-friendly-products", offerExamples: ["Natural-fibre workwear", "Farm clothing", "Traceable textile products"] },
  { slug: "compostable-reusable-tableware", name: "Compostable or reusable plates and tableware", group: "eco-friendly-products", offerExamples: ["Certified-compostable plates", "Reusable tableware", "Agricultural-fibre serving products"] },
  { slug: "bamboo-products", name: "Bamboo products", group: "eco-friendly-products", offerExamples: ["Bamboo household items", "Bamboo farm products", "Bamboo packaging"] },
  { slug: "farm-produce-value-added-products", name: "Products made from farm produce", group: "eco-friendly-products", offerExamples: ["Value-added foods", "Plant-fibre products", "Produce-based household products"] },
  { slug: "agricultural-residue-byproduct-products", name: "Products made from agricultural residues or by-products", group: "eco-friendly-products", offerExamples: ["Bagasse products", "Crop-residue boards", "Husk and coir products"] },
  { slug: "drones-precision-agriculture", name: "Drones and precision agriculture", group: "machinery", offerExamples: ["Drone spraying", "Sensors", "Farm mapping"] },
  { slug: "seeds-planting-material", name: "Seeds and planting material", group: "inputs", offerExamples: ["Certified seed", "Saplings", "Nursery stock"] },
  { slug: "fertilizers-soil-inputs", name: "Fertilizers and soil inputs", group: "inputs", offerExamples: ["Fertilizer", "Biofertilizer", "Soil conditioners"] },
  { slug: "crop-protection-biologicals", name: "Crop protection and biologicals", group: "inputs", offerExamples: ["Biocontrol", "Pesticides", "Integrated pest management"] },
  { slug: "animal-feed-fodder", name: "Animal feed and fodder", group: "animal-aquaculture", offerExamples: ["Cattle feed", "Poultry feed", "Fodder"] },
  { slug: "veterinary-animal-health", name: "Veterinary and animal health", group: "animal-aquaculture", offerExamples: ["Veterinary care", "Vaccines", "Diagnostics"] },
  { slug: "poultry-equipment-hatcheries", name: "Poultry equipment and hatcheries", group: "animal-aquaculture", offerExamples: ["Chicks", "Incubators", "Housing equipment"] },
  { slug: "aquaculture-inputs-equipment", name: "Aquaculture inputs and equipment", group: "animal-aquaculture", offerExamples: ["Fish seed", "Aerators", "Aquaculture feed"] },
  { slug: "packaging-grading-packhouse", name: "Packaging, grading and packhouse", group: "supply-chain", offerExamples: ["Crates", "Grading", "Packhouse services"] },
  { slug: "storage-warehousing-cold-chain", name: "Storage, warehousing and cold chain", group: "supply-chain", offerExamples: ["Cold rooms", "Warehousing", "Controlled storage"] },
  { slug: "transport-logistics", name: "Transport and logistics", group: "supply-chain", offerExamples: ["First-mile pickup", "Refrigerated transport", "Freight"] },
  { slug: "food-processing-value-addition", name: "Food processing and value addition", group: "supply-chain", offerExamples: ["Milling", "Drying", "Processing contracts"] },
  { slug: "soil-water-laboratory", name: "Soil, water and residue laboratories", group: "professional-services", offerExamples: ["Soil testing", "Water testing", "Residue testing"] },
  { slug: "certification-traceability", name: "Certification and traceability", group: "professional-services", offerExamples: ["Organic certification", "Traceability", "Audit support"] },
  { slug: "agronomy-advisory", name: "Agronomy and farm advisory", group: "professional-services", offerExamples: ["Crop advisory", "Farm visits", "Production planning"] },
  { slug: "training-extension", name: "Training and extension", group: "professional-services", offerExamples: ["Workshops", "Demonstrations", "Farmer training"] },
  { slug: "weather-data-software", name: "Weather, data and farm software", group: "professional-services", offerExamples: ["Weather alerts", "Farm records", "Market intelligence"] },
  { slug: "finance-credit-payments", name: "Finance, credit and payments", group: "professional-services", requiresHumanReview: true, offerExamples: ["Working capital", "Equipment finance", "Payments"] },
  { slug: "insurance-risk-services", name: "Insurance and risk services", group: "professional-services", requiresHumanReview: true, offerExamples: ["Crop insurance", "Livestock cover", "Risk assessment"] },
  { slug: "wholesale-trading", name: "Wholesale and agricultural trading", group: "markets", offerExamples: ["Bulk procurement", "Aggregation", "Mandi trade"] },
  { slug: "processors-exporters", name: "Processors and exporters", group: "markets", offerExamples: ["Contract sourcing", "Export procurement", "Processing supply"] },
  { slug: "retail-hospitality-institutional-buyers", name: "Retail, hospitality and institutional buyers", group: "markets", offerExamples: ["Recurring procurement", "Restaurant supply", "Institutional tenders"] },
  { slug: "fpo-cooperative-services", name: "FPO and cooperative services", group: "markets", offerExamples: ["Aggregation", "Member services", "Collective marketing"] },
  { slug: "grain-milling-flour", name: "Grain milling and flour", group: "farmer-dependent-industries", offerExamples: ["Wheat procurement", "Millet sourcing", "Pulses for milling"] },
  { slug: "edible-oils-oilseeds", name: "Edible oils and oilseeds", group: "farmer-dependent-industries", offerExamples: ["Groundnut sourcing", "Mustard seed procurement", "Cold-pressed oil inputs"] },
  { slug: "dairy-processing", name: "Dairy processing", group: "farmer-dependent-industries", offerExamples: ["Milk collection", "Dairy ingredient sourcing", "Recurring producer contracts"] },
  { slug: "poultry-egg-processing", name: "Poultry and egg processing", group: "farmer-dependent-industries", offerExamples: ["Egg procurement", "Poultry sourcing", "Processing supply"] },
  { slug: "meat-processing", name: "Meat processing", group: "farmer-dependent-industries", requiresHumanReview: true, offerExamples: ["Licensed livestock sourcing", "Cold-chain procurement", "Processing supply"] },
  { slug: "seafood-processing", name: "Seafood processing", group: "farmer-dependent-industries", offerExamples: ["Fish procurement", "Shrimp sourcing", "Chilled seafood supply"] },
  { slug: "fruit-vegetable-processing", name: "Fruit and vegetable processing", group: "farmer-dependent-industries", offerExamples: ["Processing-grade fruit", "Vegetable contracts", "Pulp and dehydration inputs"] },
  { slug: "beverages-brewing", name: "Beverages and brewing", group: "farmer-dependent-industries", requiresHumanReview: true, offerExamples: ["Fruit sourcing", "Barley procurement", "Botanical ingredients"] },
  { slug: "spices-condiments", name: "Spices and condiments", group: "farmer-dependent-industries", offerExamples: ["Whole spice sourcing", "Chilli procurement", "Herb contracts"] },
  { slug: "animal-feed-manufacturing", name: "Animal feed manufacturing", group: "farmer-dependent-industries", offerExamples: ["Maize procurement", "Fodder inputs", "Oilseed meal sourcing"] },
  { slug: "textiles-natural-fibres", name: "Textiles and natural fibres", group: "farmer-dependent-industries", offerExamples: ["Cotton sourcing", "Jute procurement", "Natural fibre contracts"] },
  { slug: "rubber-latex-products", name: "Natural rubber and latex products", group: "farmer-dependent-industries", offerExamples: ["Latex sourcing", "Natural rubber procurement", "Producer contracts"] },
  { slug: "bioenergy-ethanol-biomass", name: "Bioenergy, ethanol and biomass", group: "farmer-dependent-industries", requiresHumanReview: true, offerExamples: ["Crop residue sourcing", "Energy crop contracts", "Biomass procurement"] },
  { slug: "natural-ingredients-cosmetics", name: "Natural ingredients and cosmetics", group: "farmer-dependent-industries", offerExamples: ["Botanical sourcing", "Essential-oil crops", "Natural ingredient contracts"] },
  { slug: "pharma-herbal-inputs", name: "Pharmaceutical and herbal inputs", group: "farmer-dependent-industries", requiresHumanReview: true, offerExamples: ["Medicinal plant sourcing", "Traceable herbs", "Pharma-grade inputs"] },
  { slug: "paper-agri-residue-packaging", name: "Paper, agri-residue and packaging", group: "farmer-dependent-industries", offerExamples: ["Bagasse sourcing", "Crop-residue fibre", "Agricultural packaging inputs"] },
] as const satisfies readonly AgricultureCompanySectorDefinition[];

export const AGRICULTURE_COMPANY_SECTORS =
  AGRICULTURE_COMPANY_SECTOR_DEFINITIONS.map((sector, index) => ({
    ...sector,
    domain: "business_sector" as const,
    translationKey: `agriculture.companySectors.${sector.slug}` as const,
    selectable: true as const,
    sortOrder: (index + 1) * 10,
    requiresHumanReview:
      "requiresHumanReview" in sector && sector.requiresHumanReview === true,
  })) satisfies readonly AgricultureCompanySector[];

export type AgricultureCompanySectorSlug =
  (typeof AGRICULTURE_COMPANY_SECTOR_DEFINITIONS)[number]["slug"];

export const ECO_FRIENDLY_COMPANY_SECTOR_SLUGS = [
  "solar-renewable-energy",
  "biodegradable-compostable-packaging",
  "compost-bio-inputs",
  "water-saving-irrigation-products",
  "reusable-repairable-farm-products",
  "sustainable-clothing-textiles",
  "compostable-reusable-tableware",
  "bamboo-products",
  "farm-produce-value-added-products",
  "agricultural-residue-byproduct-products",
] as const satisfies readonly AgricultureCompanySectorSlug[];

const ECO_FRIENDLY_COMPANY_SECTOR_SLUG_SET = new Set<string>(
  ECO_FRIENDLY_COMPANY_SECTOR_SLUGS,
);

export function isEcoFriendlyCompanySector(slug: string) {
  return ECO_FRIENDLY_COMPANY_SECTOR_SLUG_SET.has(slug);
}

export function hasEcoFriendlyCompanySector(slugs: readonly string[]) {
  return slugs.some(isEcoFriendlyCompanySector);
}

export function agricultureCompanySectorBySlug(slug: string) {
  return AGRICULTURE_COMPANY_SECTORS.find((sector) => sector.slug === slug);
}
