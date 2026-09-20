export type VistarakuStoreProduct = Readonly<{
  slug: string;
  name: string;
  category: string;
  image: string;
  imageAlt: string;
  wholesalePrice: number;
  packQuantity: number;
  unitLabel: string;
  gstNote?: string;
  note?: string;
}>;

const leafImage = (category: string) => {
  if (category === "Lunch & dinner") return "/images/vistaraku/plate-round.png";
  if (category === "Thali & sitting") return "/images/vistaraku/thali.png";
  if (category === "Compartment plates") return "/images/vistaraku/compartment.png";
  if (category === "Breakfast plates") return "/images/vistaraku/breakfast.jpg";
  if (category === "Snack plates") return "/images/vistaraku/snack.png";
  if (category === "Bowls") return "/images/vistaraku/bowl.jpg";
  if (category === "Takeaway boxes") return "/images/vistaraku/box.jpg";
  if (category === "Glasses") return "/images/vistaraku/glass.jpg";
  if (category === "Cutlery") return "/images/vistaraku/spoon.jpg";
  if (category === "Straws") return "/images/vistaraku/straw.jpg";
  return "/images/vistaraku/hero.jpg";
};

const imageAlt = (category: string) => `Vistaraku ${category.toLowerCase()} made from plant-based materials`;

const product = (
  slug: string,
  name: string,
  category: string,
  wholesalePrice: number,
  packQuantity: number,
  unitLabel: string,
  options: Pick<VistarakuStoreProduct, "gstNote" | "note"> = {},
): VistarakuStoreProduct => ({
  slug,
  name,
  category,
  image: leafImage(category),
  imageAlt: imageAlt(category),
  wholesalePrice,
  packQuantity,
  unitLabel,
  ...options,
});

/**
 * Customer-facing catalog derived from Vistaraku's wholesale price list.
 * Store prices intentionally apply a 1.30 markup to the source per-piece price.
 */
export const VISTARAKU_STORE_PRODUCTS: readonly VistarakuStoreProduct[] = [
  product("stitched-leaf-13-14", "13–14 in stitched leaf", "Stitched leaf", 5, 100, "piece", { note: "Raw stitched leaf sheets for further pressing. Photo on request." }),
  product("stitched-leaf-18-20", "18–20 in stitched leaf", "Stitched leaf", 6.5, 100, "piece", { note: "Raw stitched leaf sheets for further pressing. Photo on request." }),
  product("bowl-45", "4.5 in bowl", "Bowls", 2.4, 25, "piece"),
  product("bowl-6-2ply", "6 in bowl — 2 ply", "Bowls", 3.9, 25, "piece"),
  product("bowl-6-3ply", "6 in bowl — 3 ply", "Bowls", 4.5, 25, "piece"),
  product("square-bowl-6", "6 in square bowl", "Bowls", 4.9, 25, "piece"),
  product("square-bowl-6-2side", "6 in square bowl — 2-side leaf", "Bowls", 6.75, 25, "piece"),
  product("square-plate-6", "6 in square plate", "Snack plates", 4.25, 25, "piece"),
  product("plate-6", "6 in plate", "Snack plates", 4.25, 25, "piece"),
  product("square-plate-7", "7 in square plate", "Snack plates", 4.75, 25, "piece"),
  product("buffet-plate-8", "8 in buffet plate", "Breakfast plates", 5, 25, "piece"),
  product("buffet-plate-10", "10 in buffet plate", "Breakfast plates", 5.5, 25, "piece"),
  product("buffet-plate-12", "12 in buffet plate", "Lunch & dinner", 6.9, 25, "piece"),
  product("square-plate-12", "12 in square plate", "Lunch & dinner", 6.9, 25, "piece"),
  product("compartment-plate-12", "12 in compartment plate", "Compartment plates", 7, 25, "piece"),
  product("sitting-plate-12", "12 in sitting plate", "Thali & sitting", 5.5, 25, "piece"),
  product("sitting-plate-13", "13 in sitting plate", "Thali & sitting", 8, 25, "piece"),
  product("sitting-plate-16", "16 in sitting plate", "Thali & sitting", 11, 25, "piece"),
  product("takeaway-box-250", "250 ml takeaway box", "Takeaway boxes", 12.5, 10, "piece"),
  product("takeaway-box-500", "500 ml takeaway box", "Takeaway boxes", 15.5, 10, "piece"),
  product("takeaway-box-900", "900 ml takeaway box", "Takeaway boxes", 17.6, 10, "piece"),
  product("cornstarch-glass-110", "110 ml cornstarch glass", "Glasses", 2.2, 50, "piece", { gstNote: "12% GST applies to this section." }),
  product("cornstarch-glass-220", "220 ml cornstarch glass", "Glasses", 3.2, 50, "piece", { gstNote: "12% GST applies to this section." }),
  product("cornstarch-glass-350", "350 ml cornstarch glass", "Glasses", 4.5, 50, "piece", { gstNote: "12% GST applies to this section." }),
  product("wooden-spoon-6", "6 in wooden spoon", "Cutlery", 1.9, 100, "piece", { gstNote: "12% GST applies to this section." }),
  product("wooden-fork-6", "6 in wooden fork", "Cutlery", 1.9, 100, "piece", { gstNote: "12% GST applies to this section." }),
  product("wooden-knife-6", "6 in wooden knife", "Cutlery", 1.9, 100, "piece", { gstNote: "12% GST applies to this section." }),
  product("wooden-ice-cream-spoon", "Wooden ice-cream spoon", "Cutlery", 1.9, 100, "piece", { gstNote: "12% GST applies to this section." }),
  product("rice-starch-straw", "Rice starch straw", "Straws", 1.5, 100, "piece", { gstNote: "12% GST applies to this section." }),
] as const;

export const VISTARAKU_MARKUP = 0.3;

export function storePrice(product: VistarakuStoreProduct) {
  return Number((product.wholesalePrice * (1 + VISTARAKU_MARKUP)).toFixed(2));
}

export function packPrice(product: VistarakuStoreProduct) {
  return Number((storePrice(product) * product.packQuantity).toFixed(2));
}

export function formatINR(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}
