import type { Metadata } from "next";
import { BusinessDashboard } from "@/features/marketplace/business-dashboard";
import { loadSellerMarketData } from "@/features/marketplace/queries";
import { redirect } from "next/navigation";
import {
  isSellerRole,
  requireUser,
} from "@/features/auth/require-user";

export const metadata: Metadata = { title: "Grow my business" };

export default async function BusinessPage() {
  const user = await requireUser();
  if (!isSellerRole(user.profile.accountRole)) {
    redirect("/purchases?notice=customer");
  }
  const { currentUser, listings, enquiries } = await loadSellerMarketData();

  return (
    <div className="product-page product-page--wide">
      <BusinessDashboard
        currentUser={currentUser}
        initialListings={listings}
        initialEnquiries={enquiries}
      />
    </div>
  );
}
