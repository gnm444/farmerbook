import type { Metadata } from "next";
import Link from "next/link";
import { ShoppingBasket, Store } from "lucide-react";
import { ProductHeader } from "@/components/product-header";
import { MarketBrowser } from "@/features/marketplace/market-browser";
import { loadPublicListings } from "@/features/marketplace/queries";
import { loadCurrentProfile } from "@/features/profiles/queries";

export const metadata: Metadata = { title: "Produce market" };

export default async function MarketPage() {
  const [listings, currentUser] = await Promise.all([
    loadPublicListings(),
    loadCurrentProfile(),
  ]);
  const customer = currentUser.accountRole === "customer";

  return (
    <div className="product-page">
      <ProductHeader
        eyebrow="Reach the market"
        title="Produce marketplace"
        description="Find current harvest lots, trusted suppliers and direct buying opportunities."
        action={
          <Link className="button" href={customer ? "/purchases" : "/business"}>
            {customer ? (
              <ShoppingBasket size={17} aria-hidden="true" />
            ) : (
              <Store size={17} aria-hidden="true" />
            )}
            {customer ? "View my purchases" : "Manage my storefront"}
          </Link>
        }
      />
      <MarketBrowser listings={listings} embedded />
    </div>
  );
}
