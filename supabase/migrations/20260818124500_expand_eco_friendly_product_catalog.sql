-- Additional seller-declared eco-product discovery categories. These rows are
-- taxonomy only and do not imply that FarmerBook reviewed an environmental
-- benefit, material composition, compostability standard, or certificate.

insert into public.agriculture_categories (
  slug, parent_slug, domain, translation_key, selectable, sort_order, status
)
select seed.slug, 'eco-friendly-products', 'business_sector',
  'agriculture.companySectors.' || seed.slug, true, seed.sort_order, 'active'
from (values
  ('sustainable-clothing-textiles', 50),
  ('compostable-reusable-tableware', 60),
  ('bamboo-products', 70),
  ('farm-produce-value-added-products', 80),
  ('agricultural-residue-byproduct-products', 90)
) as seed(slug, sort_order)
where exists (
  select 1
  from public.agriculture_categories parent
  where parent.slug = 'eco-friendly-products'
    and parent.domain = 'business_sector'
)
on conflict (slug) do update set
  parent_slug = excluded.parent_slug,
  domain = excluded.domain,
  translation_key = excluded.translation_key,
  selectable = excluded.selectable,
  sort_order = excluded.sort_order,
  status = excluded.status;
