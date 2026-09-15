export const VISTARAKU_PARTNER = Object.freeze({
  name: "Vistaraku",
  kind: "Manufacturer brand",
  sector: "Compostable and reusable tableware",
  website: "https://www.vistaraku.co.in/",
  email: "sales@vistaraku.co.in",
  phones: ["+91 9701001560", "+91 8309972307"],
  address:
    "H.No. 12-2-725/26/1, P&T Colony, Rethibowli, opposite pillar 45, Hyderabad 500028",
  hours: "Monday to Saturday, 9:00 am to 5:00 pm; Sunday closed",
  reviewedAt: "2026-09-15",
});

export const VISTARAKU_CATEGORY_NAMES = [
  "Lunch and dinner plates",
  "Compartment plates",
  "Breakfast plates",
  "Snack plates",
  "Bowls",
  "Food boxes",
  "Wooden cutlery",
  "Rice straws",
  "Cups",
] as const;

export type VistarakuCategory = (typeof VISTARAKU_CATEGORY_NAMES)[number];

export const VISTARAKU_CATALOG_REVIEWED_AT = "2026-09-15";

export type VistarakuProduct = Readonly<{
  slug: string;
  name: string;
  category: VistarakuCategory;
  material: string;
  dimensions: string;
  packQuantity: number;
  minimumOrderQuantity: number | null;
  minimumOrderNote?: string;
  sourceUrl: string;
  sourceReviewedAt: typeof VISTARAKU_CATALOG_REVIEWED_AT;
  imageId: string;
  imageAlt: string;
  notes?: string;
}>;

const source = (path: string) => `https://www.vistaraku.co.in/${path}`;

type VistarakuProductDraft = Omit<VistarakuProduct, "sourceReviewedAt">;

const vistarakuProducts: readonly VistarakuProductDraft[] = [
  { slug: "10-inch-square-lunch-plate", name: '10" square lunch / dinner plate', category: "Lunch and dinner plates", material: "Areca palm leaf", dimensions: "10 × 10 in", packQuantity: 25, minimumOrderQuantity: 500, sourceUrl: source("lunch"), imageId: "7b740b_9a1d13f53f9248e5b9e36c57b4d29a74~mv2.png", imageAlt: "Vistaraku 10-inch square areca palm leaf plate" },
  { slug: "12-inch-lunch-plate", name: '12" lunch / dinner plate', category: "Lunch and dinner plates", material: "Areca palm leaf", dimensions: "11.5 in diameter × 0.5 in deep", packQuantity: 25, minimumOrderQuantity: 500, sourceUrl: source("lunch"), imageId: "7b740b_be99a318ae0944948305f2251c68cebe~mv2.png", imageAlt: "Vistaraku 12-inch round areca palm leaf plate" },
  { slug: "13-inch-thali", name: '13" lunch / dinner thali', category: "Lunch and dinner plates", material: "Areca palm leaf", dimensions: "13 in diameter × 1 in deep", packQuantity: 25, minimumOrderQuantity: 250, sourceUrl: source("lunch"), imageId: "7b740b_330ceeb1032e4e9ca8115a33974256bf~mv2.png", imageAlt: "Vistaraku 13-inch areca palm leaf thali" },
  { slug: "16-inch-thali", name: '16" lunch / dinner thali', category: "Lunch and dinner plates", material: "Areca palm leaf", dimensions: "16 in diameter × 1 in deep", packQuantity: 25, minimumOrderQuantity: 250, sourceUrl: source("lunch"), imageId: "7b740b_316ded69f13d4070979f732c0f4f6c6e~mv2.jpg", imageAlt: "Vistaraku 16-inch areca palm leaf thali" },
  { slug: "12-inch-compartment-plate", name: '12" compartment plate', category: "Compartment plates", material: "Areca palm leaf", dimensions: "11.5 × 11.5 × 0.5 in", packQuantity: 25, minimumOrderQuantity: 500, sourceUrl: source("compartment"), imageId: "7b740b_a0c599b0824d4bc78e21b731d5c6b749~mv2.png", imageAlt: "Vistaraku 12-inch compartment plate" },
  { slug: "10-inch-breakfast-plate", name: '10" breakfast plate', category: "Breakfast plates", material: "Areca palm leaf", dimensions: "9.5 in diameter × 0.2 in deep", packQuantity: 25, minimumOrderQuantity: 550, sourceUrl: source("breakfast"), imageId: "7b740b_58b45717a3c044bcbe169eab686b1851~mv2.jpg", imageAlt: "Vistaraku 10-inch breakfast plate" },
  { slug: "8-inch-breakfast-plate", name: '8" breakfast plate', category: "Breakfast plates", material: "Areca palm leaf", dimensions: "8.5 in diameter × 0.2 in deep", packQuantity: 25, minimumOrderQuantity: 550, sourceUrl: source("breakfast"), imageId: "7b740b_9673c3c926c343eca31b66a599f2b639~mv2.jpg", imageAlt: "Vistaraku 8-inch breakfast plate" },
  { slug: "7-inch-square-snack-plate", name: '7" square snack plate', category: "Snack plates", material: "Areca palm leaf", dimensions: "7 × 7 × 0.2 in", packQuantity: 25, minimumOrderQuantity: null, minimumOrderNote: "MOQ is not published; confirm it with the manufacturer.", sourceUrl: source("snack"), imageId: "7b740b_b92552f19246415bb393c51b467c1e24~mv2.png", imageAlt: "Vistaraku 7-inch square snack plate" },
  { slug: "6-inch-snack-plate", name: '6" snack plate', category: "Snack plates", material: "Areca palm leaf", dimensions: "6 in diameter × 0.2 in deep", packQuantity: 25, minimumOrderQuantity: 550, sourceUrl: source("snack"), imageId: "7b740b_d5bee1cdba1f43c7b28e49586c354277~mv2.jpg", imageAlt: "Vistaraku 6-inch snack plate" },
  { slug: "6-inch-bowl", name: '6" bowl', category: "Bowls", material: "Areca palm leaf", dimensions: "6 in diameter × 2.4 in deep", packQuantity: 25, minimumOrderQuantity: 1250, sourceUrl: source("bowls"), imageId: "7b740b_b76fe25a3ab34dd298e064a374f337cc~mv2.jpg", imageAlt: "Vistaraku 6-inch areca palm leaf bowl" },
  { slug: "4-inch-square-bowl", name: '4" square bowl', category: "Bowls", material: "Areca palm leaf", dimensions: "4.5 × 4.5 × 2 in", packQuantity: 25, minimumOrderQuantity: null, minimumOrderNote: "MOQ is listed as to be decided; confirm it with the manufacturer.", sourceUrl: source("bowls"), imageId: "7b740b_90652014949647bcb13042c84571f7fb~mv2.jpg", imageAlt: "Representative Vistaraku 4-inch areca palm leaf bowl" },
  { slug: "4-inch-round-bowl", name: '4" round bowl', category: "Bowls", material: "Areca palm leaf", dimensions: "4.5 in diameter × 2 in deep", packQuantity: 25, minimumOrderQuantity: 2500, sourceUrl: source("bowls"), imageId: "7b740b_90652014949647bcb13042c84571f7fb~mv2.jpg", imageAlt: "Representative Vistaraku 4-inch areca palm leaf bowl" },
  { slug: "900ml-food-box", name: "900 ml food box", category: "Food boxes", material: "Areca palm leaf", dimensions: "10 × 10 × 1.4 in", packQuantity: 10, minimumOrderQuantity: 500, sourceUrl: source("boxes"), imageId: "7b740b_8f9710e919504f0bac5a8608035f0784~mv2.jpg", imageAlt: "Vistaraku 900 ml food box", notes: "The manufacturer describes this for dry and semi-dry food and says it is not spill-proof." },
  { slug: "500ml-food-box", name: "500 ml food box", category: "Food boxes", material: "Areca palm leaf", dimensions: "7.9 × 5.5 × 1.6 in", packQuantity: 10, minimumOrderQuantity: 250, sourceUrl: source("boxes"), imageId: "7b740b_ef04c160c3ca4de1af190ea62b8cff50~mv2.png", imageAlt: "Vistaraku 500 ml food box", notes: "The manufacturer describes this for dry and semi-dry food and says it is not spill-proof." },
  { slug: "250ml-food-box", name: "250 ml food box", category: "Food boxes", material: "Areca palm leaf", dimensions: "5.5 × 5.5 × 1.5 in", packQuantity: 10, minimumOrderQuantity: 500, sourceUrl: source("boxes"), imageId: "7b740b_b1ac4c7d64394e4bb14546e3c2c34e35~mv2.png", imageAlt: "Vistaraku 250 ml food box", notes: "The manufacturer describes this for dry and semi-dry food and says it is not spill-proof." },
  { slug: "wooden-spoon", name: '6.2" wooden spoon', category: "Wooden cutlery", material: "Wood", dimensions: "6.2 in long", packQuantity: 100, minimumOrderQuantity: 1000, sourceUrl: source("cutlery"), imageId: "7b740b_734c07a45b8548ae9b47be26762aae1a~mv2.jpeg", imageAlt: "Vistaraku wooden spoon" },
  { slug: "wooden-fork", name: '6.2" wooden fork', category: "Wooden cutlery", material: "Wood", dimensions: "6.2 in long", packQuantity: 100, minimumOrderQuantity: 1000, sourceUrl: source("cutlery"), imageId: "7b740b_cc8f10c7e3b141b2bc859f50bf56cab9~mv2.png", imageAlt: "Vistaraku wooden fork" },
  { slug: "wooden-knife", name: '6.2" wooden knife', category: "Wooden cutlery", material: "Wood", dimensions: "6.2 in long", packQuantity: 100, minimumOrderQuantity: 1000, sourceUrl: source("cutlery"), imageId: "7b740b_7dd5d63b4bcf40548c2a421f26681e82~mv2.jpeg", imageAlt: "Vistaraku wooden knife" },
  { slug: "wooden-dessert-spoon", name: '3" wooden dessert spoon', category: "Wooden cutlery", material: "Wood", dimensions: "3 in long", packQuantity: 100, minimumOrderQuantity: 1000, sourceUrl: source("cutlery"), imageId: "7b740b_ca2eccfd12844012921b2f8bb1be214e~mv2.png", imageAlt: "Vistaraku wooden dessert spoon" },
  { slug: "rice-straws", name: "Rice straws (8 mm / 12 mm)", category: "Rice straws", material: "Rice-based straw", dimensions: "8 mm or 12 mm diameter", packQuantity: 100, minimumOrderQuantity: 25000, sourceUrl: source("cutlery"), imageId: "7b740b_95f8aa6278524345a6d8f73f50751810~mv2.jpeg", imageAlt: "Vistaraku rice straws" },
  { slug: "100ml-cornstarch-cup", name: "100 ml cornstarch cup", category: "Cups", material: "Cornstarch", dimensions: "2.5 in high × 2.2 in diameter", packQuantity: 25, minimumOrderQuantity: 250, sourceUrl: source("cups"), imageId: "7b740b_54af3fc503f94fe6a821feb24c60874f~mv2.jpg", imageAlt: "Vistaraku 100 ml cornstarch cup" },
  { slug: "220ml-bagasse-cup", name: "220 ml sugarcane bagasse cup", category: "Cups", material: "Sugarcane bagasse", dimensions: "3.5 in high × 3 in diameter", packQuantity: 25, minimumOrderQuantity: 1000, sourceUrl: source("cups"), imageId: "7b740b_57a42ae26ba64418842c1b949d0d0d60~mv2.png", imageAlt: "Vistaraku 220 ml sugarcane bagasse cup" },
] as const;

export const VISTARAKU_PRODUCTS: readonly VistarakuProduct[] = Object.freeze(
  vistarakuProducts.map((product) =>
    Object.freeze({
      ...product,
      sourceReviewedAt: VISTARAKU_CATALOG_REVIEWED_AT,
    }),
  ),
) satisfies readonly VistarakuProduct[];

export const VISTARAKU_PRODUCT_SLUGS = VISTARAKU_PRODUCTS.map(
  (product) => product.slug,
) as [string, ...string[]];

export function findVistarakuProduct(slug: string) {
  return VISTARAKU_PRODUCTS.find((product) => product.slug === slug) ?? null;
}
