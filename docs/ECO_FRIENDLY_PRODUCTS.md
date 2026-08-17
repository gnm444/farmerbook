# Eco-friendly products

FarmerBook organizations can select concrete eco-friendly product sectors during Inc onboarding and use the same categories on business offers:

- biodegradable and compostable packaging;
- compost and biological farm inputs;
- water-saving irrigation and farm products;
- solar and renewable farm energy; and
- reusable and repairable farm products.

“Eco-friendly” is a seller-declared discovery label, not a FarmerBook certification. A named environmental standard or certificate must use the existing certification-claim evidence and review workflow before it is described as reviewed.

This catalog does not bypass staged rollout. Organization onboarding requires the existing `ENABLE_AGRI_BUSINESSES` application flag and `agri_businesses` release control. Public business offers additionally require `ENABLE_BUSINESS_OFFERS` and the `business_offers` release control. Enable those controls only after the corresponding database migrations are applied; this catalog migration does not silently enable them.
