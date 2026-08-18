# Eco-friendly products

FarmerBook organizations can select concrete eco-friendly product sectors during Inc onboarding and use the same categories on business offers:

- biodegradable and compostable packaging;
- compost and biological farm inputs;
- water-saving irrigation and farm products;
- solar and renewable farm energy; and
- reusable and repairable farm products;
- sustainable clothing and natural-fibre textiles;
- compostable or reusable plates and tableware;
- bamboo items;
- value-added products made from farm produce; and
- products made from agricultural residues or by-products.

“Eco-friendly” is a seller-declared discovery label, not a FarmerBook certification. A named environmental standard or certificate must use the existing certification-claim evidence and review workflow before it is described as reviewed.

For tableware, the catalog name deliberately omits “certified.” A supplier claiming certified-compostable tableware must add a public certificate/evidence link in the intake. Conventional, merely biodegradable, or unclassified single-use plastic tableware language is blocked. Compostable-plastic evidence remains pending until a trusted reviewer checks the exact product scope, CPCB evidence, and applicable state rules. See `ECO_PRODUCT_CLAIMS_POLICY.md` for the deterministic review rules.

This catalog does not bypass staged rollout. Organization onboarding requires the existing `ENABLE_AGRI_BUSINESSES` application flag and `agri_businesses` release control. Public business offers additionally require `ENABLE_BUSINESS_OFFERS` and the `business_offers` release control. Enable those controls only after the corresponding database migrations are applied; this catalog migration does not silently enable them.

## Public supplier intake

`/eco-products` is deliberately public and does not depend on organization, offer, outreach, outbound-email, or database release controls. Manufacturers, brands, dealers, and distributors complete a validated application in their browser. FarmerBook then prepares a structured email addressed to `ceo@farmerbook.in`; the applicant reviews and sends it from their own email application. If no email application is configured, the page provides a copyable summary and the public phone number.

The page does not save the draft, transmit it automatically, upload evidence, or publish a supplier. A human reviews relevance and named evidence before inviting an applicant into the authenticated company workflow. This gives production a useful intake path without enabling schemas that have not been migrated.

Apply both eco catalog migrations after the agriculture taxonomy foundation:

1. `20260818123000_eco_friendly_product_catalog.sql`
2. `20260818124500_expand_eco_friendly_product_catalog.sql`
