-- Harden sourced-farmer grants against permissive production default privileges.

revoke all on table public.ecosystem_release_controls
from public, anon, authenticated, service_role;

grant select, update (enabled)
on table public.ecosystem_release_controls to service_role;

revoke all on table public.farmer_source_channels,
  public.farmer_source_videos,
  public.farmer_source_discovery_runs,
  public.sourced_farmer_profiles,
  public.sourced_farmer_facts,
  public.farmer_source_events
from public, anon, authenticated, service_role;

grant select on table public.farmer_source_channels to service_role;
grant select on table public.farmer_source_videos to service_role;
grant select on table public.farmer_source_discovery_runs to service_role;
grant select on table public.sourced_farmer_profiles to service_role;
grant select on table public.sourced_farmer_facts to service_role;
grant select on table public.farmer_source_events to service_role;

revoke all on function public.is_sourced_farmer_topic_slugs(text[]),
  public.is_sourced_farmer_actor_counts(jsonb),
  public.is_sourced_farmer_channel_actor_counts(jsonb),
  public.is_sourced_farmer_evidence_url(text),
  public.sourced_farmer_contains_contact_text(text),
  public.sourced_farmer_set_updated_at(),
  public.prevent_farmer_source_event_mutation(),
  public.assert_sourced_farmer_research_access(uuid),
  public.reserve_sourced_farmer_discovery(uuid, text, uuid),
  public.save_sourced_farmer_discovery_batch(uuid, uuid, jsonb, uuid),
  public.complete_sourced_farmer_discovery(uuid, uuid, jsonb, uuid),
  public.create_sourced_farmer_profile(uuid, jsonb, uuid),
  public.review_sourced_farmer_profile(uuid, uuid, text, integer, uuid),
  public.archive_sourced_farmer_profile(uuid, uuid, text, integer, uuid),
  public.purge_expired_farmer_source_data(uuid, integer, uuid)
from public, anon, authenticated, service_role;

grant execute on function public.reserve_sourced_farmer_discovery(
  uuid, text, uuid
) to service_role;
grant execute on function public.save_sourced_farmer_discovery_batch(
  uuid, uuid, jsonb, uuid
) to service_role;
grant execute on function public.complete_sourced_farmer_discovery(
  uuid, uuid, jsonb, uuid
) to service_role;
grant execute on function public.create_sourced_farmer_profile(
  uuid, jsonb, uuid
) to service_role;
grant execute on function public.review_sourced_farmer_profile(
  uuid, uuid, text, integer, uuid
) to service_role;
grant execute on function public.archive_sourced_farmer_profile(
  uuid, uuid, text, integer, uuid
) to service_role;
grant execute on function public.purge_expired_farmer_source_data(
  uuid, integer, uuid
) to service_role;
