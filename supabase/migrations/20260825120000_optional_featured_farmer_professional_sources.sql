-- Temporarily make professional website evidence optional for Featured Farmer
-- stories while retaining claim citations, owned-social confirmation, story
-- depth, media rights and administrator fact-check review. One private control
-- restores the stronger professional-source gate without another migration.

alter table public.ecosystem_release_controls
  drop constraint if exists ecosystem_release_controls_control_key_check;
alter table public.ecosystem_release_controls
  add constraint ecosystem_release_controls_control_key_check check (
    control_key in (
      'resumable_onboarding', 'agri_businesses', 'business_offers',
      'extended_locales', 'outreach_agent', 'inc_sourcing',
      'profile_research_agents', 'managed_operations_agents',
      'featured_farmer_profiles', 'private_farmer_contacts',
      'sourced_farmer_research', 'support_social_pilot', 'ai_company',
      'live_agent_execution',
      'featured_farmer_professional_sources_required'
    )
  );

insert into public.ecosystem_release_controls (control_key, enabled)
values ('featured_farmer_professional_sources_required', false)
on conflict (control_key) do nothing;

create or replace function public.refresh_featured_farmer_readiness(
  research_id_input uuid
)
returns table(ready boolean, blockers text[], revision integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  research public.featured_farmer_research%rowtype;
  draft public.featured_farmer_drafts%rowtype;
  require_professional_sources boolean :=
    public.is_ecosystem_release_enabled(
      'featured_farmer_professional_sources_required'
    );
  professional_domains integer := 0;
  authoritative_sources integer := 0;
  approved_claims integer := 0;
  uncited_claims integer := 0;
  social_links integer := 0;
  media_unapproved integer := 0;
  reasons text[] := '{}'::text[];
  is_ready boolean := false;
begin
  select item.* into research
  from public.featured_farmer_research item
  where item.id = research_id_input
  for update;
  if not found then
    raise exception 'Featured Farmer research not found'
      using errcode = 'P0002', detail = 'NOT_FOUND';
  end if;
  select item.* into draft
  from public.featured_farmer_drafts item
  where item.research_id = research.id
  for update;
  if not found then
    return query select false, array['Draft is required']::text[], research.revision;
    return;
  end if;

  select count(distinct source.publisher_host) into professional_domains
  from public.featured_farmer_sources source
  where source.research_id = research.id and source.decision = 'selected'
    and source.source_type = 'website'
    and source.retention_expires_at > now()
    and source.source_quality in (
      'official_record', 'institutional_reference', 'independent_reporting',
      'first_party'
    );
  select count(*) into authoritative_sources
  from public.featured_farmer_sources source
  where source.research_id = research.id and source.decision = 'selected'
    and source.retention_expires_at > now()
    and source.source_quality in (
      'official_record', 'institutional_reference', 'independent_reporting'
    );
  select count(*) into approved_claims
  from public.featured_farmer_claims claim
  where claim.draft_id = draft.id and claim.review_state = 'approved';
  select count(*) into uncited_claims
  from public.featured_farmer_claims claim
  where claim.draft_id = draft.id and claim.review_state = 'approved'
    and not exists (
      select 1
      from public.featured_farmer_claim_sources link
      join public.featured_farmer_sources source on source.id = link.source_id
      where link.claim_id = claim.id and source.research_id = research.id
        and source.decision = 'selected'
        and source.retention_expires_at > now()
    );
  select count(*) into social_links
  from public.featured_farmer_social_links social
  join public.featured_farmer_sources source on source.id = social.source_id
  where social.draft_id = draft.id and source.research_id = research.id
    and source.decision = 'selected'
    and source.subject_association = 'owned_social_profile'
    and source.source_quality = 'owned_social_profile'
    and source.source_type = social.platform
    and source.source_url = social.profile_url
    and public.is_supported_owned_social_profile_url(
      source.source_type, source.source_url
    );
  select count(*) into media_unapproved
  from public.featured_farmer_media media
  where media.draft_id = draft.id and (
    media.approved_at is null or media.approved_by is null
  );

  if require_professional_sources and professional_domains < 2 then
    reasons := array_append(reasons, 'TWO_PROFESSIONAL_DOMAINS_REQUIRED');
  end if;
  if require_professional_sources and authoritative_sources < 1 then
    reasons := array_append(reasons, 'AUTHORITATIVE_SOURCE_REQUIRED');
  end if;
  if approved_claims < 2 then
    reasons := array_append(reasons, 'TWO_SIGNIFICANCE_CLAIMS_REQUIRED');
  end if;
  if uncited_claims > 0 then
    reasons := array_append(reasons, 'EVERY_CLAIM_REQUIRES_SELECTED_SOURCE');
  end if;
  if social_links < 1 then
    reasons := array_append(reasons, 'OWNED_SOCIAL_REQUIRED');
  end if;
  if jsonb_array_length(draft.story_sections) < 3 then
    reasons := array_append(reasons, 'THREE_STORY_SECTIONS_REQUIRED');
  end if;
  if media_unapproved > 0 then
    reasons := array_append(reasons, 'MEDIA_RIGHTS_REQUIRED');
  end if;
  is_ready := cardinality(reasons) = 0;

  update public.featured_farmer_drafts current
  set state = case when is_ready then 'review_ready' else 'drafting' end,
      revision = current.revision + 1
  where current.id = draft.id;
  update public.featured_farmer_research current
  set state = case when is_ready then 'review_ready' else 'drafting' end,
      revision = current.revision + 1
  where current.id = research.id;
  return query select is_ready, reasons, research.revision + 1;
end;
$$;
