import { Leaf } from "lucide-react";
import { hasEcoFriendlyCompanySector } from "@/lib/agriculture/company-sectors";

export const ECO_FRIENDLY_SELLER_DECLARATION =
  "“Eco-friendly” is a seller-declared product description, not a FarmerBook certification. A named environmental standard or certificate is shown as reviewed only after its evidence claim is separately checked.";

export function EcoFriendlyClaimNotice({
  sectorSlugs = [],
  alwaysVisible = false,
}: {
  sectorSlugs?: readonly string[];
  alwaysVisible?: boolean;
}) {
  if (!alwaysVisible && !hasEcoFriendlyCompanySector(sectorSlugs)) return null;

  return (
    <aside className="notice" aria-label="Eco-friendly claim disclosure">
      <Leaf size={18} aria-hidden="true" />
      <div>
        <strong>Seller-declared eco-friendly category</strong>
        <p>{ECO_FRIENDLY_SELLER_DECLARATION}</p>
      </div>
    </aside>
  );
}
