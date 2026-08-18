"use client";

import { useLocale, useTranslations } from "@/components/locale-provider";
import {
  AGRICULTURE_COMPANY_SECTORS,
  isEcoFriendlyCompanySector,
} from "@/lib/agriculture/company-sectors";
import {
  ecoSupplierFallbackLanguageProps,
  ecoSupplierSectorMessageName,
} from "@/lib/i18n/eco-suppliers";

const ecoFriendlySectors = AGRICULTURE_COMPANY_SECTORS.filter((sector) =>
  isEcoFriendlyCompanySector(sector.slug),
);
const otherSectors = AGRICULTURE_COMPANY_SECTORS.filter(
  (sector) => !isEcoFriendlyCompanySector(sector.slug),
);

export function CompanySectorOptions() {
  const locale = useLocale();
  const eco = useTranslations("ecoSuppliers");
  const fallbackLanguageProps = ecoSupplierFallbackLanguageProps(locale);

  function labelFor(slug: string, fallback: string) {
    const messageName = ecoSupplierSectorMessageName(slug);
    return messageName ? eco(messageName) : fallback;
  }

  return (
    <>
      <optgroup
        label={eco("groupEcoFriendly")}
        {...fallbackLanguageProps}
      >
        {ecoFriendlySectors.map((sector) => (
          <option key={sector.slug} value={sector.slug}>
            {labelFor(sector.slug, sector.name)}
          </option>
        ))}
      </optgroup>
      <optgroup label={eco("groupOtherAgriculture")} {...fallbackLanguageProps}>
        {otherSectors.map((sector) => (
          <option key={sector.slug} value={sector.slug}>{sector.name}</option>
        ))}
      </optgroup>
    </>
  );
}
