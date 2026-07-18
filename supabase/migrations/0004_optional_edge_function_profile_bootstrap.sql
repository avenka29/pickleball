create or replace function public.bootstrap_current_profile()
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_email text;
  whitelisted_role text;
  jwt jsonb;
  profile_row public.profiles%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  jwt := auth.jwt();
  normalized_email := lower(coalesce(jwt ->> 'email', ''));

  select w.role_on_signup
  into whitelisted_role
  from public.whitelist w
  where w.email = normalized_email
    and w.revoked_at is null;

  if whitelisted_role is null then
    raise exception 'Email is not whitelisted' using errcode = '42501';
  end if;

  insert into public.profiles (
    id,
    email,
    display_name,
    avatar_url,
    role
  )
  values (
    auth.uid(),
    normalized_email,
    nullif(coalesce(jwt -> 'user_metadata' ->> 'full_name', jwt -> 'user_metadata' ->> 'name'), ''),
    nullif(coalesce(jwt -> 'user_metadata' ->> 'avatar_url', jwt -> 'user_metadata' ->> 'picture'), ''),
    whitelisted_role
  )
  on conflict (id) do update
  set
    email = excluded.email,
    display_name = coalesce(public.profiles.display_name, excluded.display_name),
    avatar_url = coalesce(public.profiles.avatar_url, excluded.avatar_url),
    role = public.profiles.role,
    updated_at = now()
  returning * into profile_row;

  return profile_row;
end;
$$;

grant execute on function public.bootstrap_current_profile() to authenticated;

