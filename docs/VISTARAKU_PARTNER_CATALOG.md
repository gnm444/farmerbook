# Vistaraku catalog candidate

Status: catalog-only release candidate; private intake is intentionally closed.

This document records the public-source basis for the FarmerBook page at
`/companies/vistaraku`, reviewed on 2026-09-15 (Asia/Kolkata). The page is a
non-transactional reference catalog: it does not collect customer data, create
orders or enquiries, take payment, notify a provider, or make availability,
price, tax, delivery, or fulfilment promises.

## Public sources

- [Vistaraku home](https://www.vistaraku.co.in/)
- [Lunch and dinner plates](https://www.vistaraku.co.in/lunch)
- [Compartment plates](https://www.vistaraku.co.in/compartment)
- [Breakfast plates](https://www.vistaraku.co.in/breakfast)
- [Snack plates](https://www.vistaraku.co.in/snack)
- [Bowls](https://www.vistaraku.co.in/bowls)
- [Food boxes](https://www.vistaraku.co.in/boxes)
- [Cutlery and rice straws](https://www.vistaraku.co.in/cutlery)
- [Cups](https://www.vistaraku.co.in/cups)

Product names, materials, dimensions, pack quantities and published MOQs are
transcribed from those pages. Each card links back to its source. A missing or
undecided MOQ stays marked as confirmation required; FarmerBook does not infer
one. This candidate deliberately does not copy, host, or embed manufacturer
imagery; readers can view it on the linked source pages.

## Catalog-only boundary and rollback

The first candidate contains only the public page, catalog data, styling,
discoverability, source-link boundary, documentation, and tests. It excludes all
private request forms, Turnstile, database migrations, service-role access,
notifications, scheduled work, and external provider actions. If a release
needs to be rolled back, remove the public route from the next immutable
candidate and restore the prior healthy Worker through the protected release
broker; this repository contains no direct production mutation path.

Any future intake candidate must be independently approved and must include
route-bound Turnstile verification, validated origin/host handling, forced RLS,
idempotency, retention/withdrawal handling, provider gating, and a separate
staging/canary review.
