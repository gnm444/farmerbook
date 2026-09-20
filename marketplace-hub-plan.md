# Implementation plan: unified marketplace hub

## Approach

Add one server-built, typed marketplace index that aggregates all discoverable
product sources already present in the repository. Render it through a small
client component on the public home page and the canonical `/marketplace`
route. Search and grouping happen in the browser; order/cart behaviour stays on
the existing seller-specific pages.

## Changes required

### 1. Canonical product index

Files:

- `features/marketplace/unified-catalog.ts` (new)
- `features/featured-farmers/queries.ts` (export curated public publications)

Add a typed `UnifiedMarketplaceItem` discovery model and builders for:

- active live listings;
- `getPublicStorefrontCatalog("user_05605c17f44")` products, linked to
  `/store/user_05605c17f44` and labelled FarmerBook enquiry;
- every Vistaraku SKU, linked to `/companies/vistaraku` and labelled cart +
  enquiry;
- published business offers, linked to `/offers/{id}` and labelled live offer;
- featured-farmer `reportedProducts` only in a visibly distinct editorial/source
  lane, linked to the story or source product URL and labelled reported/external.

Include seller and seller destination, category, source, availability, `href`,
image, price/disclosure label and a normalized search string. Use a stable
source-prefixed id to avoid collisions. Never turn a reported or external
catalogue into a live FarmerBook listing or imply certification. Seller-group
cards must use an explicit seller destination rather than the first product's
possibly external URL.

### 2. Shared marketplace browse component

File: `features/marketplace/unified-marketplace.tsx` (new)

Create a client component that accepts the typed index and renders:

- labelled search input;
- `By product` / `By seller` toggle buttons;
- derived category filters;
- responsive tiles with icon/image, seller, status, price and route link;
- a separate visual cue for editorial/source references;
- result count and an accessible no-results state;
- short source/availability disclosure.

Seller view groups products without losing individual product links. Product view
shows searchable product names and category labels. All navigation is a real
`Link`/anchor with visible focus styles.

### 3. Home integration

Files:

- `app/page.tsx`
- `lib/i18n/messages/en-IN.ts`

Load the static catalogues and live listings safely on the server. Insert the
unified marketplace section directly after the hero/buyer path area so buying is
discoverable before the editorial showcase. Add concise translated labels and
disclosures; other locale files inherit English defaults through their existing
spread pattern.

### 4. Canonical marketplace integration

File: `app/marketplace/page.tsx`

Add the same hub above or alongside the live listing browser, keeping the
existing live listing filters and enquiry flows intact. The page title and home
links will now point to one authoritative marketplace destination.

### 5. Styles and tests

Files:

- `app/globals.css`
- `tests/unified-marketplace.test.tsx` (new)
- focused existing marketplace/Vistaraku tests as needed

Add responsive, low-clutter tile styles and tests for aggregation, source
labels, search, grouping, empty state and route destinations. Run typecheck,
focused tests, lint, build and `git diff --check`.

## Test strategy

- Unit tests verify every source contributes expected items and that editorial
  items remain `reported` rather than `live`.
- Component tests verify product/seller grouping, case-insensitive search,
  empty state and accessible links.
- Typecheck/lint/build catch server/client boundary and CSS/import mistakes.
- If the local app can run, perform a browser smoke check at `/` and
  `/marketplace` on desktop and narrow mobile widths.

## Rollback

The change is additive. Remove the new index/component and the two render
insertions to restore the prior home and marketplace surfaces. Existing seller
pages, carts, order forms and database listings remain unchanged.

## TODO

- [DONE] Add the typed aggregate model and builders.
- [DONE] Expose curated published publications for the aggregate.
- [DONE] Add the client search/group component.
- [DONE] Integrate home and `/marketplace`.
- [DONE] Add translations and responsive styles.
- [DONE] Add focused tests.
- [DONE] Run full verification and inspect the diff for unrelated changes.
