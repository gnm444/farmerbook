import {
  AGRICULTURE_COMPANY_SECTORS,
  isEcoFriendlyCompanySector,
} from "@/lib/agriculture/company-sectors";

const ecoFriendlySectors = AGRICULTURE_COMPANY_SECTORS.filter((sector) =>
  isEcoFriendlyCompanySector(sector.slug),
);
const otherSectors = AGRICULTURE_COMPANY_SECTORS.filter(
  (sector) => !isEcoFriendlyCompanySector(sector.slug),
);

export function CompanySectorOptions() {
  return (
    <>
      <optgroup label="Eco-friendly products — seller-declared">
        {ecoFriendlySectors.map((sector) => (
          <option key={sector.slug} value={sector.slug}>{sector.name}</option>
        ))}
      </optgroup>
      <optgroup label="Other agriculture sectors">
        {otherSectors.map((sector) => (
          <option key={sector.slug} value={sector.slug}>{sector.name}</option>
        ))}
      </optgroup>
    </>
  );
}
