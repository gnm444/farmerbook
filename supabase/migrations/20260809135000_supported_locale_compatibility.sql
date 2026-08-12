-- Outreach was designed against the public locale-code vocabulary while the
-- canonical foundation column is named locale_tag. Preserve locale_tag as the
-- source of truth and expose a generated, unique compatibility identity before
-- the outreach foreign key is created.

alter table public.supported_locales
  add column locale_code text generated always as (locale_tag) stored;
alter table public.supported_locales
  add constraint supported_locales_locale_code_key unique (locale_code);
