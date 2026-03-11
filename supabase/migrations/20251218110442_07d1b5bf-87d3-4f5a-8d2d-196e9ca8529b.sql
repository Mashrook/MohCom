-- Ensure every user with role 'lawyer' has a lawyer_profiles row
-- 1) Backfill existing lawyer roles
insert into public.lawyer_profiles (
  user_id,
  specialty,
  experience_years,
  hourly_rate,
  location,
  is_available,
  rating,
  reviews_count,
  badges,
  bio,
  created_at,
  updated_at
)
select
  ur.user_id,
  'قانون عام'::text,
  1,
  300,
  'الرياض'::text,
  false,
  0,
  0,
  array['معتمد']::text[],
  null,
  now(),
  now()
from public.user_roles ur
where ur.role = 'lawyer'
  and not exists (
    select 1 from public.lawyer_profiles lp where lp.user_id = ur.user_id
  );

-- 2) Trigger to auto-create lawyer profile on role assignment
create or replace function public.ensure_lawyer_profile_exists()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.role = 'lawyer' then
    insert into public.lawyer_profiles (
      user_id,
      specialty,
      experience_years,
      hourly_rate,
      location,
      is_available,
      rating,
      reviews_count,
      badges,
      bio,
      created_at,
      updated_at
    )
    values (
      new.user_id,
      'قانون عام',
      1,
      300,
      'الرياض',
      false,
      0,
      0,
      array['معتمد'],
      null,
      now(),
      now()
    )
    on conflict (user_id) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_ensure_lawyer_profile_exists on public.user_roles;
create trigger trg_ensure_lawyer_profile_exists
after insert or update of role
on public.user_roles
for each row
execute function public.ensure_lawyer_profile_exists();

-- 3) Helpful index
create index if not exists idx_lawyer_profiles_user_id on public.lawyer_profiles (user_id);