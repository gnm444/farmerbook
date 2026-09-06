# Featured Farmer: Sukhavasi Hari Babu

## Objective

Add a published curated Featured Farmer profile for the Natural Farming Hari Babu YouTube channel, with a substantial source-bound introduction, documented farming work, citations, and a descending observed high-view video selection.

## Scope

- Add one static publication object under `features/featured-farmers/`.
- Register it in the curated publication loader.
- Add focused schema/render/registration tests.
- Preserve the existing public route and disclosure model.
- Run typecheck, lint, focused tests, and production build.
- Deploy only from an isolated worktree if all checks pass; verify the live slug and sitemap.

## Editorial decisions

- Profile name: Sukhavasi Hari Babu; public-facing short name may be Hari Babu.
- State: Telangana; district omitted.
- Slug: `sukhavasi-hari-babu-natural-farming`.
- Five YouTube videos stored in descending observed view order, with counts marked as observed on 2026-08-28.
- Claims are explicitly attributed to cited public sources and limitations explain that FarmerBook has not independently inspected the farm.

## Files

- [x] `research.md` — append source findings and guardrails.
- [x] `FEATURED_FARMER_HARIBABU_PLAN.md` — task execution record.
- [x] `features/featured-farmers/sukhavasi-hari-babu.ts` — publication data.
- [x] `features/featured-farmers/queries.ts` — registry import/order.
- [x] `tests/sukhavasi-hari-babu-featured-farmer.test.tsx` — focused coverage.
- [x] `tests/sandeep-dasari-featured-farmer.test.tsx` — curated order expectation.
- [x] `tests/platform-routes.test.ts` — sitemap expectation.
- [x] `implementation-log.md` — release record.

## Verification and rollback

- Use `npm run check` plus the focused Vitest test.
- Use `npm run build` with the same production-safe environment used for the last successful Worker release.
- Verify `GET /featured-farmers/sukhavasi-hari-babu-natural-farming`, `/featured-farmers`, `/sitemap.xml`, and `/api/health`.
- Rollback is the previous known-good Worker version if the new route or shared loader regresses.

## Completion

- [x] 2026-08-28: Focused tests, full Vitest suite (189 files / 861 tests), lint, TypeScript, isolated production build, strict Wrangler dry run and live HTTP checks passed.
- [x] Production Worker version `04a3eae3-5dfa-4671-a4e1-728979a7b6cc` deployed at 100 percent on FarmerBook custom domains.
- [x] Live profile, collection, sitemap and health endpoints verified.
