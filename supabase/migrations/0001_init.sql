create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  display_name text,
  avatar_url text,
  role text not null default 'player',
  elo integer,
  matches_played integer not null default 0,
  wins integer not null default 0,
  losses integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_role_check check (role in ('player', 'admin')),
  constraint profiles_record_check check (
    matches_played >= 0
    and wins >= 0
    and losses >= 0
    and matches_played = wins + losses
  )
);

create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

create table public.whitelist (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  role_on_signup text not null default 'player',
  note text,
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  constraint whitelist_email_lower_check check (email = lower(email)),
  constraint whitelist_role_on_signup_check check (role_on_signup in ('player', 'admin'))
);

create or replace function public.normalize_whitelist_email()
returns trigger
language plpgsql
as $$
begin
  new.email = lower(trim(new.email));
  return new;
end;
$$;

create trigger whitelist_normalize_email
before insert or update of email on public.whitelist
for each row
execute function public.normalize_whitelist_email();

create table public.themes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  rule_type text not null,
  rule_config jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint themes_window_check check (starts_at < ends_at)
);

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  winner_id uuid not null references public.profiles(id),
  loser_id uuid not null references public.profiles(id),
  winner_score integer,
  loser_score integer,
  theme_id uuid references public.themes(id),
  multiplier numeric not null default 1,
  created_by uuid references public.profiles(id),
  played_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint matches_distinct_players_check check (winner_id <> loser_id),
  constraint matches_multiplier_check check (multiplier > 0),
  constraint matches_scores_check check (
    (winner_score is null or winner_score >= 0)
    and (loser_score is null or loser_score >= 0)
  )
);

create table public.match_participants (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  profile_id uuid not null references public.profiles(id),
  result text not null check (result in ('win', 'loss')),
  elo_before integer,
  elo_after integer,
  elo_delta integer not null default 0,
  created_at timestamptz not null default now(),
  unique (match_id, profile_id)
);

create type public.tournament_status as enum ('draft', 'open', 'in_progress', 'completed', 'cancelled');
create type public.tournament_format as enum ('single_elimination');
create type public.tournament_match_status as enum ('pending', 'bye', 'ready', 'completed');

create table public.tournaments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  format public.tournament_format not null default 'single_elimination',
  status public.tournament_status not null default 'open',
  max_entries integer,
  starts_at timestamptz,
  seeded_randomly boolean not null default true,
  winner_id uuid references public.profiles(id),
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tournaments_max_entries_check check (max_entries is null or max_entries >= 2)
);

create trigger tournaments_set_updated_at
before update on public.tournaments
for each row
execute function public.set_updated_at();

create table public.tournament_entries (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  profile_id uuid not null references public.profiles(id),
  seed integer,
  is_bye boolean not null default false,
  eliminated_at timestamptz,
  created_at timestamptz not null default now(),
  unique (tournament_id, profile_id),
  unique (tournament_id, seed),
  constraint tournament_entries_seed_check check (seed is null or seed > 0)
);

create table public.tournament_matches (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  match_id uuid references public.matches(id) on delete set null,
  round integer not null,
  position integer not null,
  player_one_id uuid references public.profiles(id),
  player_two_id uuid references public.profiles(id),
  winner_id uuid references public.profiles(id),
  next_match_id uuid references public.tournament_matches(id) on delete set null,
  next_slot integer check (next_slot in (1, 2)),
  status public.tournament_match_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tournament_id, round, position),
  constraint tournament_matches_round_position_check check (round > 0 and position > 0),
  constraint tournament_matches_winner_participant_check check (
    winner_id is null or winner_id in (player_one_id, player_two_id)
  )
);

create trigger tournament_matches_set_updated_at
before update on public.tournament_matches
for each row
execute function public.set_updated_at();

create index profiles_elo_idx on public.profiles (elo desc nulls last, wins desc);
create index whitelist_active_email_idx on public.whitelist (email) where revoked_at is null;
create index matches_played_at_idx on public.matches (played_at desc);
create index matches_players_idx on public.matches (winner_id, loser_id, played_at desc);
create index match_participants_profile_idx on public.match_participants (profile_id, created_at desc);
create index themes_active_window_idx on public.themes (is_active, starts_at, ends_at);
create index tournament_entries_tournament_idx on public.tournament_entries (tournament_id, seed);
create index tournament_matches_tournament_round_idx on public.tournament_matches (tournament_id, round, position);

create or replace function public.is_whitelisted()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.whitelist w
    where w.email = lower(coalesce(auth.jwt() ->> 'email', ''))
      and w.revoked_at is null
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
      and public.is_whitelisted()
  );
$$;

create or replace function public.tournament_has_open_slot(p_tournament_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.tournaments t
    where t.id = p_tournament_id
      and t.status = 'open'
      and (
        t.max_entries is null
        or (
          select count(*)
          from public.tournament_entries te
          where te.tournament_id = p_tournament_id
        ) < t.max_entries
      )
  );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_email text;
  whitelisted_role text;
begin
  normalized_email := lower(coalesce(new.email, new.raw_user_meta_data ->> 'email', ''));

  select w.role_on_signup
  into whitelisted_role
  from public.whitelist w
  where w.email = normalized_email
    and w.revoked_at is null;

  if whitelisted_role is null then
    return new;
  end if;

  insert into public.profiles (id, email, display_name, avatar_url, role)
  values (
    new.id,
    normalized_email,
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(new.raw_user_meta_data ->> 'avatar_url', ''),
    whitelisted_role
  )
  on conflict (id) do update
  set
    email = excluded.email,
    display_name = coalesce(public.profiles.display_name, excluded.display_name),
    avatar_url = coalesce(public.profiles.avatar_url, excluded.avatar_url),
    role = public.profiles.role,
    updated_at = now();

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.whitelist enable row level security;
alter table public.themes enable row level security;
alter table public.matches enable row level security;
alter table public.match_participants enable row level security;
alter table public.tournaments enable row level security;
alter table public.tournament_entries enable row level security;
alter table public.tournament_matches enable row level security;

create policy "whitelisted users can read profiles"
on public.profiles for select
to authenticated
using (public.is_whitelisted());

create policy "admins can update profiles"
on public.profiles for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "admins can read whitelist"
on public.whitelist for select
to authenticated
using (public.is_admin());

create policy "admins can manage whitelist"
on public.whitelist for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "whitelisted users can read themes"
on public.themes for select
to authenticated
using (public.is_whitelisted());

create policy "admins can manage themes"
on public.themes for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "whitelisted users can read matches"
on public.matches for select
to authenticated
using (public.is_whitelisted());

create policy "whitelisted users can insert matches"
on public.matches for insert
to authenticated
with check (
  public.is_whitelisted()
  and created_by = auth.uid()
  and winner_id <> loser_id
);

create policy "admins can update matches"
on public.matches for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "whitelisted users can read match participants"
on public.match_participants for select
to authenticated
using (public.is_whitelisted());

create policy "admins can manage match participants"
on public.match_participants for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "whitelisted users can read tournaments"
on public.tournaments for select
to authenticated
using (public.is_whitelisted());

create policy "admins can manage tournaments"
on public.tournaments for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "whitelisted users can read tournament entries"
on public.tournament_entries for select
to authenticated
using (public.is_whitelisted());

create policy "whitelisted users can join open tournaments"
on public.tournament_entries for insert
to authenticated
with check (
  public.is_whitelisted()
  and profile_id = auth.uid()
  and public.tournament_has_open_slot(tournament_id)
);

create policy "admins can manage tournament entries"
on public.tournament_entries for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "whitelisted users can read tournament matches"
on public.tournament_matches for select
to authenticated
using (public.is_whitelisted());

create policy "admins can manage tournament matches"
on public.tournament_matches for all
to authenticated
using (public.is_admin())
with check (public.is_admin());
