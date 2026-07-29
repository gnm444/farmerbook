-- FarmerBook application previews use fictional fixtures in lib/demo-data.ts.
-- When local Auth users have been created, this seed safely enriches matching
-- profiles without attempting to manufacture auth.users rows.

update public.profiles
set
  full_name = 'Local Demo Farmer',
  participant_type = 'farmer',
  district = 'Nashik',
  state = 'Maharashtra',
  crops = array['Tomato', 'Onion'],
  bio = 'Fictional local-development participant.',
  onboarding_complete = true
where handle like 'user_%'
  and not onboarding_complete;
