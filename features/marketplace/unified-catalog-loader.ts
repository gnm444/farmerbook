import { loadPublicOffers } from "@/features/offers/queries";
import { loadPublicListings } from "./queries";
import { buildUnifiedMarketplaceCatalog } from "./unified-catalog";

/**
 * Load the public discovery index without allowing an unavailable live data
 * source to hide the static seller catalogues that are still useful to buyers.
 */
export async function loadUnifiedMarketplaceCatalog() {
  const [listingResult, offerResult] = await Promise.allSettled([
    loadPublicListings(),
    loadPublicOffers({ limit: 50 }),
  ]);

  return buildUnifiedMarketplaceCatalog({
    produceListings:
      listingResult.status === "fulfilled" ? listingResult.value : [],
    businessOffers:
      offerResult.status === "fulfilled" ? offerResult.value : [],
  });
}
