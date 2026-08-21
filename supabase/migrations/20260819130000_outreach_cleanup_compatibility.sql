-- Complete the production compatibility bridge for installations that
-- intentionally skipped the original outreach migration. The managed Growth
-- & Outreach worker calls this bounded cleanup before claiming delivery work;
-- without it, the worker fails closed before a provider request.

create or replace function public.purge_expired_outreach_research(
  limit_input integer default 100
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  deleted_count integer;
begin
  if coalesce((select auth.role()), '') <> 'service_role' then
    raise exception 'Service role required'
      using errcode = '42501', detail = 'SERVICE_ROLE_REQUIRED';
  end if;

  with expired as (
    select prospect.id
    from public.outreach_prospects prospect
    where prospect.retention_expires_at <= now()
      and prospect.consent_granted_at is null
      and prospect.status in (
        'discovered', 'consent_blocked', 'consent_requested', 'declined',
        'expired', 'withdrawn', 'suppressed'
      )
      and not exists (
        select 1
        from public.outreach_consents consent
        where consent.prospect_id = prospect.id
      )
    order by prospect.retention_expires_at
    for update skip locked
    limit least(greatest(coalesce(limit_input, 100), 1), 500)
  )
  delete from public.outreach_prospects prospect
  using expired
  where prospect.id = expired.id;

  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

revoke all on function public.purge_expired_outreach_research(integer)
  from public, anon, authenticated;
grant execute on function public.purge_expired_outreach_research(integer)
  to service_role;
