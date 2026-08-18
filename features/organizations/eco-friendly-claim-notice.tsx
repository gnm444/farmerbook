"use client";

import { Leaf } from "lucide-react";
import { useLocale, useTranslations } from "@/components/locale-provider";
import { hasEcoFriendlyCompanySector } from "@/lib/agriculture/company-sectors";
import { ecoSupplierFallbackLanguageProps } from "@/lib/i18n/eco-suppliers";

export const ECO_FRIENDLY_SELLER_DECLARATION =
  "“Eco-friendly” is a seller-declared product description, not a FarmerBook certification. A named environmental standard or certificate is shown as reviewed only after its evidence claim is separately checked.";

export function EcoFriendlyClaimNotice({
  sectorSlugs = [],
  alwaysVisible = false,
}: {
  sectorSlugs?: readonly string[];
  alwaysVisible?: boolean;
}) {
  const locale = useLocale();
  const eco = useTranslations("ecoSuppliers");
  if (!alwaysVisible && !hasEcoFriendlyCompanySector(sectorSlugs)) return null;

  return (
    <aside
      className="notice"
      aria-label={eco("claimDisclosureAria")}
      {...ecoSupplierFallbackLanguageProps(locale)}
    >
      <Leaf size={18} aria-hidden="true" />
      <div>
        <strong>{eco("sellerDeclaredLabel")}</strong>
        <p>{eco("sellerDeclaredDisclosure")}</p>
      </div>
    </aside>
  );
}
