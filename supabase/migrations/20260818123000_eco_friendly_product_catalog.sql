-- Seller-declared eco-friendly product discovery. The umbrella is deliberately
-- not selectable: providers choose a concrete product category instead. These
-- taxonomy rows do not create or imply an environmental certification.

insert into public.agriculture_categories (
  slug, parent_slug, domain, translation_key, selectable, sort_order, status
) values (
  'eco-friendly-products', null, 'business_sector',
  'agriculture.companySectors.eco-friendly-products', false, 300, 'active'
)
on conflict (slug) do update set
  parent_slug = excluded.parent_slug,
  domain = excluded.domain,
  translation_key = excluded.translation_key,
  selectable = excluded.selectable,
  sort_order = excluded.sort_order,
  status = excluded.status;

insert into public.agriculture_categories (
  slug, parent_slug, domain, translation_key, selectable, sort_order, status
)
select seed.slug, 'eco-friendly-products', 'business_sector',
  'agriculture.companySectors.' || seed.slug, true, seed.sort_order, 'active'
from (values
  ('biodegradable-compostable-packaging', 10),
  ('compost-bio-inputs', 20),
  ('water-saving-irrigation-products', 30),
  ('reusable-repairable-farm-products', 40)
) as seed(slug, sort_order)
on conflict (slug) do update set
  parent_slug = excluded.parent_slug,
  domain = excluded.domain,
  translation_key = excluded.translation_key,
  selectable = excluded.selectable,
  sort_order = excluded.sort_order,
  status = excluded.status;

-- Solar products already had a stable public slug. Re-parent it instead of
-- creating a duplicate category or rewriting existing organization/offer data.
update public.agriculture_categories
set parent_slug = 'eco-friendly-products'
where slug = 'solar-renewable-energy'
  and domain = 'business_sector';
