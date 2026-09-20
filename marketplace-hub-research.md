# Marketplace hub research

## Scope

Create one public, searchable marketplace surface on `/` and make `/marketplace`
the canonical browse destination. The surface must bring together existing
product entry points while preserving the correct fulfilment path and disclosure
for each source.

## Current sources

```text
Home `/` (app/page.tsx:27-416)
  └── buyer card -> `/marketplace`

`/marketplace` (app/marketplace/page.tsx:18-99)
  └── active Supabase `produce_listings` only

`/store/[handle]` (app/store/[handle]/page.tsx:158-203)
  └── public-storefront-catalog.ts
      └── Avani Van Farms / Sandeep catalogue + FarmerBook order request

`/companies/vistaraku` (app/companies/vistaraku/page.tsx:20-45)
  └── VISTARAKU_STORE_PRODUCTS (features/vistaraku/store-products.ts:54+)
      └── dedicated cart + enquiry checkout

`/featured-farmers/[slug]` (features/featured-farmers/public-profile.tsx:460-506)
  └── curated publication snapshots from featured-farmers/queries.ts:357-369
      └── reportedProducts: reported / externally sourced catalogue items
```

## Important distinctions

1. `produce_listings` are live FarmerBook listings and can use the existing
   listing detail/enquiry flow.
2. Avani Van Farms is a FarmerBook-managed catalogue with an order request
   form, but its own note says stock, price and delivery must be confirmed.
3. Vistaraku is a FarmerBook-hosted partner storefront with a pack cart and
   enquiry submission. It is not the same data model as a live harvest lot.
4. Featured Farmer `reportedProducts` are editorial/source-linked products.
   They must be searchable and discoverable, but must retain the `reported`
   label and external/source route; they are not automatically FarmerBook
   inventory or certification.

## Gaps

- Home only points buyers to `/marketplace`; it does not index store or
  featured-farmer products.
- `/marketplace` only renders active Supabase listings.
- Vistaraku products are not part of marketplace search.
- Featured farmer products are rendered only within their story pages.
- Static catalogues are not safe to silently convert into live lots.

## Recommended architecture

Use one typed read model for the public browse layer:

```text
UnifiedMarketplaceItem
  id, name, category, sellerName, sellerKind
  source: live_listing | farmerbook_store | partner_store | editorial_catalogue
  availability: live | enquiry | external | reported
  href, image?, priceLabel?, searchText
```

Build it server-side from the existing sources and pass it to one client
component used on the home page. Keep the existing seller pages as the
fulfilment destinations. The client component owns only search, grouping and
keyboard-accessible view state; it does not create orders or duplicate carts.

The home module should provide:

- one prominent search field;
- `By product` and `By seller` views;
- category chips derived from the indexed items;
- product/seller tiles with explicit status badges;
- direct links to live listings, Avani order request, Vistaraku cart, or
  external/editorial source pages;
- an empty state and a concise disclosure explaining that availability and
  fulfilment vary by tile.

The canonical `/marketplace` page should use the same index and search model,
so the homepage is a doorway into the same marketplace rather than a separate
catalogue.

## Verification risks

- Do not call external URLs from server code to build the index.
- Do not show editorial products as active FarmerBook listings.
- Do not make `/companies` a dependency because its feature flag can return
  404; link directly to `/companies/vistaraku` where needed.
- Preserve the existing working-tree Vistaraku, pledge and deployment changes.
- Ensure the home index is resilient when Supabase is unavailable.
- Test keyboard search, empty search, status labels, mobile wrapping and the
  route links for all source types.
