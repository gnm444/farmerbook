-- Add the discovery category used for agriculture-focused entrepreneurs,
-- NGOs and public-interest ecosystem builders.
insert into public.agriculture_categories (
  slug,
  parent_slug,
  domain,
  translation_key,
  selectable,
  sort_order
)
values ('agripreneurs-ngos',
  null,
  'business_sector',
  'agriculture.companySectors.agripreneurs-ngos',
  true,
  225
)
on conflict (slug) do update
set
  parent_slug = excluded.parent_slug,
  domain = excluded.domain,
  translation_key = excluded.translation_key,
  selectable = excluded.selectable,
  sort_order = excluded.sort_order,
  status = 'active';
