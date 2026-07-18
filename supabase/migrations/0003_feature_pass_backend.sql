do $$
begin
  if not exists (select 1 from pg_type where typname = 'match_mode') then
    create type public.match_mode as enum ('singles', 'doubles', 'tournament');
  end if;
end $$;

alter type public.tournament_status add value if not exists 'Drafting';
alter type public.tournament_status add value if not exists 'Active';
alter type public.tournament_status add value if not exists 'Completed';

alter table public.tournaments
  alter column status drop default,
  alter column status type text using status::text,
  alter column status set default 'Drafting';

alter table public.tournaments
  drop constraint if exists tournaments_status_check,
  add constraint tournaments_status_check check (
    status in ('draft', 'open', 'in_progress', 'completed', 'cancelled', 'Drafting', 'Active', 'Completed')
  );

alter table public.profiles
  add column if not exists singles_elo integer,
  add column if not exists doubles_elo integer,
  add column if not exists singles_matches_played integer not null default 0,
  add column if not exists doubles_matches_played integer not null default 0,
  add column if not exists singles_wins integer not null default 0,
  add column if not exists singles_losses integer not null default 0,
  add column if not exists doubles_wins integer not null default 0,
  add column if not exists doubles_losses integer not null default 0;

update public.profiles
set
  singles_elo = coalesce(singles_elo, elo),
  singles_matches_played = case
    when singles_matches_played = 0 then matches_played
    else singles_matches_played
  end,
  singles_wins = case
    when singles_wins = 0 then wins
    else singles_wins
  end,
  singles_losses = case
    when singles_losses = 0 then losses
    else singles_losses
  end
where matches_played > 0 or elo is not null;

alter table public.profiles
  drop constraint if exists profiles_singles_record_check,
  drop constraint if exists profiles_doubles_record_check,
  add constraint profiles_singles_record_check check (
    singles_matches_played >= 0
    and singles_wins >= 0
    and singles_losses >= 0
    and singles_matches_played = singles_wins + singles_losses
  ),
  add constraint profiles_doubles_record_check check (
    doubles_matches_played >= 0
    and doubles_wins >= 0
    and doubles_losses >= 0
    and doubles_matches_played = doubles_wins + doubles_losses
  );

alter table public.matches
  add column if not exists mode public.match_mode not null default 'singles',
  add column if not exists winner_partner_id uuid references public.profiles(id),
  add column if not exists loser_partner_id uuid references public.profiles(id),
  add column if not exists tournament_id uuid references public.tournaments(id) on delete set null,
  add column if not exists tournament_match_id uuid references public.tournament_matches(id) on delete set null,
  add column if not exists active_theme_id uuid,
  add column if not exists rating_bucket text not null default 'singles',
  add column if not exists winner_team_elo_before numeric,
  add column if not exists loser_team_elo_before numeric;

alter table public.matches
  drop constraint if exists matches_mode_shape_check,
  add constraint matches_mode_shape_check check (
    (
      mode in ('singles', 'tournament')
      and winner_partner_id is null
      and loser_partner_id is null
      and winner_id <> loser_id
    )
    or (
      mode = 'doubles'
      and winner_partner_id is not null
      and loser_partner_id is not null
      and winner_id <> winner_partner_id
      and loser_id <> loser_partner_id
      and winner_id not in (loser_id, loser_partner_id)
      and winner_partner_id not in (loser_id, loser_partner_id)
    )
  );

alter table public.match_participants
  add column if not exists mode public.match_mode not null default 'singles',
  add column if not exists rating_bucket text not null default 'singles',
  add column if not exists team text check (team in ('winner', 'loser')),
  add column if not exists partner_id uuid references public.profiles(id),
  add column if not exists team_elo_before numeric;

create table if not exists public.active_themes (
  id uuid primary key default gen_random_uuid(),
  theme_id uuid references public.themes(id) on delete set null,
  name text not null,
  slug text not null unique,
  description text,
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null default (now() + interval '7 days'),
  multiplier_logic jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint active_themes_window_check check (starts_at < ends_at)
);

alter table public.matches
  drop constraint if exists matches_active_theme_id_fkey,
  add constraint matches_active_theme_id_fkey
    foreign key (active_theme_id) references public.active_themes(id) on delete set null;

drop trigger if exists active_themes_set_updated_at on public.active_themes;
create trigger active_themes_set_updated_at
before update on public.active_themes
for each row
execute function public.set_updated_at();

alter table public.active_themes enable row level security;

drop policy if exists "whitelisted users can read active themes" on public.active_themes;
create policy "whitelisted users can read active themes"
on public.active_themes for select
to authenticated
using (public.is_whitelisted());

drop policy if exists "admins can manage active themes" on public.active_themes;
create policy "admins can manage active themes"
on public.active_themes for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create index if not exists profiles_singles_elo_idx on public.profiles (singles_elo desc nulls last, singles_wins desc);
create index if not exists profiles_doubles_elo_idx on public.profiles (doubles_elo desc nulls last, doubles_wins desc);
create index if not exists matches_mode_played_at_idx on public.matches (mode, played_at desc);
create index if not exists matches_tournament_match_idx on public.matches (tournament_match_id) where tournament_match_id is not null;
create index if not exists active_themes_active_window_idx on public.active_themes (is_active, starts_at, ends_at);

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
      and t.status in ('draft', 'open', 'Drafting')
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

create or replace function public.active_match_theme_config()
returns public.active_themes
language sql
stable
security definer
set search_path = public
as $$
  select at.*
  from public.active_themes at
  where at.is_active
    and now() >= at.starts_at
    and now() < at.ends_at
  order by at.starts_at desc, at.created_at desc
  limit 1;
$$;

create or replace function public.last_head_to_head_was_loss(
  p_mode public.match_mode,
  p_winner_id uuid,
  p_loser_id uuid,
  p_winner_partner_id uuid default null,
  p_loser_partner_id uuid default null
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  last_match public.matches%rowtype;
begin
  if p_mode in ('singles', 'tournament') then
    select *
    into last_match
    from public.matches m
    where m.mode in ('singles', 'tournament')
      and (
        (m.winner_id = p_winner_id and m.loser_id = p_loser_id)
        or (m.winner_id = p_loser_id and m.loser_id = p_winner_id)
      )
    order by m.played_at desc, m.created_at desc
    limit 1;

    return found and last_match.winner_id = p_loser_id;
  end if;

  select *
  into last_match
  from public.matches m
  where m.mode = 'doubles'
    and array[m.winner_id, m.winner_partner_id]::uuid[] <@ array[p_winner_id, p_winner_partner_id, p_loser_id, p_loser_partner_id]::uuid[]
    and array[m.loser_id, m.loser_partner_id]::uuid[] <@ array[p_winner_id, p_winner_partner_id, p_loser_id, p_loser_partner_id]::uuid[]
    and array[p_winner_id, p_winner_partner_id]::uuid[] <@ array[m.winner_id, m.winner_partner_id, m.loser_id, m.loser_partner_id]::uuid[]
    and array[p_loser_id, p_loser_partner_id]::uuid[] <@ array[m.winner_id, m.winner_partner_id, m.loser_id, m.loser_partner_id]::uuid[]
  order by m.played_at desc, m.created_at desc
  limit 1;

  return found
    and array[p_loser_id, p_loser_partner_id]::uuid[] <@ array[last_match.winner_id, last_match.winner_partner_id]::uuid[];
end;
$$;

create or replace function public.doubles_new_partner_multiplier(
  p_winner_id uuid,
  p_winner_partner_id uuid
)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select case
    when exists (
      select 1
      from public.matches m
      where m.mode = 'doubles'
        and array[p_winner_id, p_winner_partner_id]::uuid[] <@ array[m.winner_id, m.winner_partner_id]::uuid[]
    ) then 1::numeric
    else 1.5::numeric
  end;
$$;

create or replace function public.resolve_match_multiplier(
  p_mode public.match_mode,
  p_winner_id uuid,
  p_loser_id uuid,
  p_winner_partner_id uuid default null,
  p_loser_partner_id uuid default null,
  p_manual_multiplier numeric default null
)
returns table (
  active_theme_id uuid,
  theme_id uuid,
  applied_multiplier numeric
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  active_theme public.active_themes%rowtype;
  logic jsonb;
  combine_mode text;
  revenge_multiplier numeric;
  partner_multiplier numeric;
begin
  if p_manual_multiplier is not null then
    if p_manual_multiplier <= 0 then
      raise exception 'Multiplier must be greater than zero' using errcode = '23514';
    end if;

    active_theme_id := null;
    theme_id := null;
    applied_multiplier := p_manual_multiplier;
    return next;
    return;
  end if;

  select * into active_theme from public.active_match_theme_config();
  logic := coalesce(active_theme.multiplier_logic, '{}'::jsonb);
  combine_mode := coalesce(logic ->> 'combine', 'max');
  applied_multiplier := coalesce((logic ->> 'base_multiplier')::numeric, 1::numeric);

  if coalesce((logic ->> 'revenge_week')::boolean, false)
    or logic @> '{"type":"revenge_week"}'
    or logic @> '{"rules":[{"type":"revenge_week"}]}' then
    if public.last_head_to_head_was_loss(p_mode, p_winner_id, p_loser_id, p_winner_partner_id, p_loser_partner_id) then
      revenge_multiplier := coalesce((logic ->> 'revenge_multiplier')::numeric, 2::numeric);
      if combine_mode = 'multiply' then
        applied_multiplier := applied_multiplier * revenge_multiplier;
      else
        applied_multiplier := greatest(applied_multiplier, revenge_multiplier);
      end if;
    end if;
  end if;

  if p_mode = 'doubles'
    and (
      coalesce((logic ->> 'doubles_new_partner')::boolean, false)
      or logic @> '{"type":"doubles_new_partner"}'
      or logic @> '{"rules":[{"type":"doubles_new_partner"}]}'
    ) then
    partner_multiplier := public.doubles_new_partner_multiplier(p_winner_id, p_winner_partner_id);
    if combine_mode = 'multiply' then
      applied_multiplier := applied_multiplier * partner_multiplier;
    else
      applied_multiplier := greatest(applied_multiplier, partner_multiplier);
    end if;
  end if;

  active_theme_id := active_theme.id;
  theme_id := active_theme.theme_id;
  return next;
end;
$$;

create or replace function public.apply_player_rating_result(
  p_profile_id uuid,
  p_bucket text,
  p_result text,
  p_opponent_average numeric,
  p_multiplier numeric,
  p_match_id uuid,
  p_mode public.match_mode,
  p_team text,
  p_partner_id uuid,
  p_team_elo_before numeric
)
returns table (
  profile_id uuid,
  elo_before integer,
  elo_after integer,
  elo_delta integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  profile public.profiles%rowtype;
  played integer;
  current_elo integer;
  expected numeric;
  actual integer;
begin
  if p_bucket not in ('singles', 'doubles') then
    raise exception 'Rating bucket must be singles or doubles' using errcode = '23514';
  end if;

  select * into profile
  from public.profiles p
  where p.id = p_profile_id
  for update;

  if not found then
    raise exception 'Profile % not found', p_profile_id using errcode = '23503';
  end if;

  actual := case when p_result = 'win' then 1 else 0 end;

  if p_bucket = 'singles' then
    played := profile.singles_matches_played;
    current_elo := profile.singles_elo;
  else
    played := profile.doubles_matches_played;
    current_elo := profile.doubles_elo;
  end if;

  elo_before := current_elo;
  elo_after := current_elo;
  elo_delta := 0;

  if played = 2 then
    elo_after := 1200;
    elo_delta := case when elo_before is null then 0 else elo_after - elo_before end;
  elsif played >= 3 then
    expected := 1 / (1 + power(10::numeric, ((p_opponent_average - current_elo)::numeric / 400)));
    elo_delta := round(32 * case when actual = 1 then p_multiplier else 1::numeric end * (actual - expected))::integer;
    elo_after := current_elo + elo_delta;
  end if;

  if p_bucket = 'singles' then
    update public.profiles
    set
      singles_elo = elo_after,
      singles_matches_played = singles_matches_played + 1,
      singles_wins = singles_wins + actual,
      singles_losses = singles_losses + (1 - actual),
      elo = case when p_mode in ('singles', 'tournament') then elo_after else elo end,
      matches_played = matches_played + case when p_mode in ('singles', 'tournament') then 1 else 0 end,
      wins = wins + case when p_mode in ('singles', 'tournament') then actual else 0 end,
      losses = losses + case when p_mode in ('singles', 'tournament') then (1 - actual) else 0 end
    where id = p_profile_id;
  else
    update public.profiles
    set
      doubles_elo = elo_after,
      doubles_matches_played = doubles_matches_played + 1,
      doubles_wins = doubles_wins + actual,
      doubles_losses = doubles_losses + (1 - actual)
    where id = p_profile_id;
  end if;

  insert into public.match_participants (
    match_id,
    profile_id,
    result,
    elo_before,
    elo_after,
    elo_delta,
    mode,
    rating_bucket,
    team,
    partner_id,
    team_elo_before
  )
  values (
    p_match_id,
    p_profile_id,
    p_result,
    elo_before,
    elo_after,
    elo_delta,
    p_mode,
    p_bucket,
    p_team,
    p_partner_id,
    p_team_elo_before
  );

  profile_id := p_profile_id;
  return next;
end;
$$;

create or replace function public.record_match_v2(
  p_mode public.match_mode,
  p_winner_id uuid,
  p_loser_id uuid,
  p_winner_score integer default null,
  p_loser_score integer default null,
  p_winner_partner_id uuid default null,
  p_loser_partner_id uuid default null,
  p_multiplier numeric default null,
  p_tournament_match_id uuid default null
)
returns table (
  match_id uuid,
  mode public.match_mode,
  theme_id uuid,
  active_theme_id uuid,
  applied_multiplier numeric,
  winner_elo_before integer,
  winner_elo_after integer,
  winner_delta integer,
  loser_elo_before integer,
  loser_elo_after integer,
  loser_delta integer,
  winner_partner_elo_before integer,
  winner_partner_elo_after integer,
  winner_partner_delta integer,
  loser_partner_elo_before integer,
  loser_partner_elo_after integer,
  loser_partner_delta integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  rating_bucket text;
  multiplier_result record;
  winner_profile public.profiles%rowtype;
  loser_profile public.profiles%rowtype;
  winner_partner_profile public.profiles%rowtype;
  loser_partner_profile public.profiles%rowtype;
  winner_team_before numeric;
  loser_team_before numeric;
  new_match_id uuid;
  result_row record;
  tournament_row public.tournament_matches%rowtype;
begin
  if auth.uid() is null or not public.is_whitelisted() then
    raise exception 'Only whitelisted authenticated users can record matches' using errcode = '42501';
  end if;

  if p_winner_id = p_loser_id then
    raise exception 'Winner and loser must be different players' using errcode = '23514';
  end if;

  if p_mode = 'doubles' then
    if p_winner_partner_id is null or p_loser_partner_id is null then
      raise exception 'Doubles matches require both partner ids' using errcode = '23514';
    end if;

    if cardinality(array[p_winner_id, p_winner_partner_id, p_loser_id, p_loser_partner_id])
      <> cardinality(array(
        select distinct unnest(array[p_winner_id, p_winner_partner_id, p_loser_id, p_loser_partner_id])
      )) then
      raise exception 'Doubles matches require four distinct players' using errcode = '23514';
    end if;
  else
    if p_winner_partner_id is not null or p_loser_partner_id is not null then
      raise exception 'Singles and tournament matches cannot include partners' using errcode = '23514';
    end if;
  end if;

  select * into winner_profile from public.profiles where id = p_winner_id;
  if not found then
    raise exception 'Winner profile not found' using errcode = '23503';
  end if;

  select * into loser_profile from public.profiles where id = p_loser_id;
  if not found then
    raise exception 'Loser profile not found' using errcode = '23503';
  end if;

  if p_mode = 'doubles' then
    select * into winner_partner_profile from public.profiles where id = p_winner_partner_id;
    if not found then
      raise exception 'Winner partner profile not found' using errcode = '23503';
    end if;

    select * into loser_partner_profile from public.profiles where id = p_loser_partner_id;
    if not found then
      raise exception 'Loser partner profile not found' using errcode = '23503';
    end if;
  end if;

  if p_mode = 'tournament' then
    if p_tournament_match_id is null then
      raise exception 'Tournament match id is required' using errcode = '23514';
    end if;

    select * into tournament_row
    from public.tournament_matches tm
    where tm.id = p_tournament_match_id
    for update;

    if not found then
      raise exception 'Tournament match not found' using errcode = '23503';
    end if;

    if tournament_row.status <> 'ready' then
      raise exception 'Tournament match must be ready to record' using errcode = '23514';
    end if;

    if p_winner_id not in (tournament_row.player_one_id, tournament_row.player_two_id)
      or p_loser_id not in (tournament_row.player_one_id, tournament_row.player_two_id) then
      raise exception 'Tournament result players must match bracket slot' using errcode = '23514';
    end if;
  end if;

  rating_bucket := case when p_mode = 'doubles' then 'doubles' else 'singles' end;

  select * into multiplier_result
  from public.resolve_match_multiplier(
    p_mode,
    p_winner_id,
    p_loser_id,
    p_winner_partner_id,
    p_loser_partner_id,
    p_multiplier
  );

  if p_mode = 'doubles' then
    winner_team_before := (
      coalesce(winner_profile.doubles_elo, 1200)::numeric
      + coalesce(winner_partner_profile.doubles_elo, 1200)::numeric
    ) / 2;
    loser_team_before := (
      coalesce(loser_profile.doubles_elo, 1200)::numeric
      + coalesce(loser_partner_profile.doubles_elo, 1200)::numeric
    ) / 2;
  else
    winner_team_before := coalesce(winner_profile.singles_elo, 1200)::numeric;
    loser_team_before := coalesce(loser_profile.singles_elo, 1200)::numeric;
  end if;

  insert into public.matches (
    winner_id,
    loser_id,
    winner_score,
    loser_score,
    theme_id,
    active_theme_id,
    multiplier,
    created_by,
    mode,
    winner_partner_id,
    loser_partner_id,
    tournament_id,
    tournament_match_id,
    rating_bucket,
    winner_team_elo_before,
    loser_team_elo_before
  )
  values (
    p_winner_id,
    p_loser_id,
    p_winner_score,
    p_loser_score,
    multiplier_result.theme_id,
    multiplier_result.active_theme_id,
    multiplier_result.applied_multiplier,
    auth.uid(),
    p_mode,
    p_winner_partner_id,
    p_loser_partner_id,
    tournament_row.tournament_id,
    p_tournament_match_id,
    rating_bucket,
    winner_team_before,
    loser_team_before
  )
  returning id into new_match_id;

  select * into result_row
  from public.apply_player_rating_result(
    p_winner_id,
    rating_bucket,
    'win',
    loser_team_before,
    multiplier_result.applied_multiplier,
    new_match_id,
    p_mode,
    'winner',
    p_winner_partner_id,
    winner_team_before
  );
  winner_elo_before := result_row.elo_before;
  winner_elo_after := result_row.elo_after;
  winner_delta := result_row.elo_delta;

  if p_mode = 'doubles' then
    select * into result_row
    from public.apply_player_rating_result(
      p_winner_partner_id,
      rating_bucket,
      'win',
      loser_team_before,
      multiplier_result.applied_multiplier,
      new_match_id,
      p_mode,
      'winner',
      p_winner_id,
      winner_team_before
    );
    winner_partner_elo_before := result_row.elo_before;
    winner_partner_elo_after := result_row.elo_after;
    winner_partner_delta := result_row.elo_delta;
  end if;

  select * into result_row
  from public.apply_player_rating_result(
    p_loser_id,
    rating_bucket,
    'loss',
    winner_team_before,
    multiplier_result.applied_multiplier,
    new_match_id,
    p_mode,
    'loser',
    p_loser_partner_id,
    loser_team_before
  );
  loser_elo_before := result_row.elo_before;
  loser_elo_after := result_row.elo_after;
  loser_delta := result_row.elo_delta;

  if p_mode = 'doubles' then
    select * into result_row
    from public.apply_player_rating_result(
      p_loser_partner_id,
      rating_bucket,
      'loss',
      winner_team_before,
      multiplier_result.applied_multiplier,
      new_match_id,
      p_mode,
      'loser',
      p_loser_id,
      loser_team_before
    );
    loser_partner_elo_before := result_row.elo_before;
    loser_partner_elo_after := result_row.elo_after;
    loser_partner_delta := result_row.elo_delta;
  end if;

  if p_mode = 'tournament' then
    update public.tournament_matches
    set
      match_id = new_match_id,
      winner_id = p_winner_id,
      status = 'completed'
    where id = p_tournament_match_id;

    if tournament_row.next_match_id is null then
      update public.tournaments
      set status = 'Completed', winner_id = p_winner_id
      where id = tournament_row.tournament_id;
    else
      update public.tournament_matches
      set
        player_one_id = case when tournament_row.next_slot = 1 then p_winner_id else player_one_id end,
        player_two_id = case when tournament_row.next_slot = 2 then p_winner_id else player_two_id end,
        status = case
          when (
            case when tournament_row.next_slot = 1 then p_winner_id else player_one_id end
          ) is not null
          and (
            case when tournament_row.next_slot = 2 then p_winner_id else player_two_id end
          ) is not null
          then 'ready'::public.tournament_match_status
          else status
        end
      where id = tournament_row.next_match_id;
    end if;
  end if;

  match_id := new_match_id;
  mode := p_mode;
  theme_id := multiplier_result.theme_id;
  active_theme_id := multiplier_result.active_theme_id;
  applied_multiplier := multiplier_result.applied_multiplier;
  return next;
end;
$$;

create or replace function public.record_singles_match(
  winner_id uuid,
  loser_id uuid,
  winner_score integer default null,
  loser_score integer default null,
  multiplier numeric default null
)
returns table (
  match_id uuid,
  theme_id uuid,
  applied_multiplier numeric,
  winner_elo_before integer,
  winner_elo_after integer,
  winner_delta integer,
  loser_elo_before integer,
  loser_elo_after integer,
  loser_delta integer
)
language sql
security definer
set search_path = public
as $$
  select
    r.match_id,
    r.theme_id,
    r.applied_multiplier,
    r.winner_elo_before,
    r.winner_elo_after,
    r.winner_delta,
    r.loser_elo_before,
    r.loser_elo_after,
    r.loser_delta
  from public.record_match_v2(
    'singles',
    winner_id,
    loser_id,
    winner_score,
    loser_score,
    null,
    null,
    multiplier,
    null
  ) r;
$$;

create or replace function public.record_match(
  winner_id uuid,
  loser_id uuid,
  winner_score integer,
  loser_score integer,
  multiplier numeric default null
)
returns table (
  match_id uuid,
  theme_id uuid,
  applied_multiplier numeric,
  winner_elo_before integer,
  winner_elo_after integer,
  winner_delta integer,
  loser_elo_before integer,
  loser_elo_after integer,
  loser_delta integer
)
language sql
security definer
set search_path = public
as $$
  select *
  from public.record_singles_match(winner_id, loser_id, winner_score, loser_score, multiplier);
$$;

create or replace function public.record_doubles_match(
  winner_id uuid,
  winner_partner_id uuid,
  loser_id uuid,
  loser_partner_id uuid,
  winner_score integer default null,
  loser_score integer default null,
  multiplier numeric default null
)
returns table (
  match_id uuid,
  theme_id uuid,
  active_theme_id uuid,
  applied_multiplier numeric,
  winner_elo_before integer,
  winner_elo_after integer,
  winner_delta integer,
  winner_partner_elo_before integer,
  winner_partner_elo_after integer,
  winner_partner_delta integer,
  loser_elo_before integer,
  loser_elo_after integer,
  loser_delta integer,
  loser_partner_elo_before integer,
  loser_partner_elo_after integer,
  loser_partner_delta integer
)
language sql
security definer
set search_path = public
as $$
  select
    r.match_id,
    r.theme_id,
    r.active_theme_id,
    r.applied_multiplier,
    r.winner_elo_before,
    r.winner_elo_after,
    r.winner_delta,
    r.winner_partner_elo_before,
    r.winner_partner_elo_after,
    r.winner_partner_delta,
    r.loser_elo_before,
    r.loser_elo_after,
    r.loser_delta,
    r.loser_partner_elo_before,
    r.loser_partner_elo_after,
    r.loser_partner_delta
  from public.record_match_v2(
    'doubles',
    winner_id,
    loser_id,
    winner_score,
    loser_score,
    winner_partner_id,
    loser_partner_id,
    multiplier,
    null
  ) r;
$$;

create or replace function public.record_tournament_match(
  tournament_match_id uuid,
  winner_id uuid,
  loser_id uuid,
  winner_score integer default null,
  loser_score integer default null,
  multiplier numeric default null
)
returns table (
  match_id uuid,
  theme_id uuid,
  active_theme_id uuid,
  applied_multiplier numeric,
  winner_elo_before integer,
  winner_elo_after integer,
  winner_delta integer,
  loser_elo_before integer,
  loser_elo_after integer,
  loser_delta integer
)
language sql
security definer
set search_path = public
as $$
  select
    r.match_id,
    r.theme_id,
    r.active_theme_id,
    r.applied_multiplier,
    r.winner_elo_before,
    r.winner_elo_after,
    r.winner_delta,
    r.loser_elo_before,
    r.loser_elo_after,
    r.loser_delta
  from public.record_match_v2(
    'tournament',
    winner_id,
    loser_id,
    winner_score,
    loser_score,
    null,
    null,
    multiplier,
    tournament_match_id
  ) r;
$$;

create or replace function public.generate_single_elimination_bracket(
  tournament_id uuid,
  random_seed text default null
)
returns table (
  tournament_match_id uuid,
  round integer,
  bracket_position integer,
  player_one_id uuid,
  player_two_id uuid,
  status public.tournament_match_status
)
language plpgsql
security definer
set search_path = public
as $$
declare
  tournament public.tournaments%rowtype;
  entry_count integer;
  bracket_size integer := 1;
  round_count integer := 0;
  current_round integer;
  current_position integer;
  first_round_matches integer;
  shuffled_players uuid[];
  player_one uuid;
  player_two uuid;
  winner uuid;
  created_match_id uuid;
  next_id uuid;
  next_slot_value integer;
  seed_float double precision;
begin
  if auth.uid() is null or not public.is_whitelisted() then
    raise exception 'Only whitelisted authenticated users can generate brackets' using errcode = '42501';
  end if;

  select * into tournament
  from public.tournaments t
  where t.id = generate_single_elimination_bracket.tournament_id
  for update;

  if not found then
    raise exception 'Tournament not found' using errcode = '23503';
  end if;

  if tournament.status not in ('draft', 'open', 'Drafting') then
    raise exception 'Tournament must be drafting/open before bracket generation' using errcode = '23514';
  end if;

  select count(*) into entry_count
  from public.tournament_entries te
  where te.tournament_id = generate_single_elimination_bracket.tournament_id
    and not te.is_bye;

  if entry_count < 2 then
    raise exception 'At least two entries are required' using errcode = '23514';
  end if;

  while bracket_size < entry_count loop
    bracket_size := bracket_size * 2;
  end loop;

  while (2 ^ round_count) < bracket_size loop
    round_count := round_count + 1;
  end loop;

  if random_seed is not null then
    seed_float := ((('x' || substr(md5(random_seed), 1, 8))::bit(32)::bigint % 2000000)::double precision / 1000000) - 1;
    perform setseed(seed_float);
  end if;

  select array_agg(profile_id order by random())
  into shuffled_players
  from public.tournament_entries te
  where te.tournament_id = generate_single_elimination_bracket.tournament_id
    and not te.is_bye;

  delete from public.tournament_matches tm
  where tm.tournament_id = generate_single_elimination_bracket.tournament_id;

  for current_round in 1..round_count loop
    for current_position in 1..(bracket_size / (2 ^ current_round)) loop
      insert into public.tournament_matches (
        tournament_id,
        round,
        position,
        status
      )
      values (
        generate_single_elimination_bracket.tournament_id,
        current_round,
        current_position,
        'pending'
      )
      returning id into created_match_id;
    end loop;
  end loop;

  for current_round in 1..(round_count - 1) loop
    for current_position in 1..(bracket_size / (2 ^ current_round)) loop
      select id into next_id
      from public.tournament_matches tm
      where tm.tournament_id = generate_single_elimination_bracket.tournament_id
        and tm.round = current_round + 1
        and tm.position = ceil(current_position::numeric / 2)::integer;

      update public.tournament_matches tm
      set
        next_match_id = next_id,
        next_slot = case when current_position % 2 = 1 then 1 else 2 end
      where tm.tournament_id = generate_single_elimination_bracket.tournament_id
        and tm.round = current_round
        and tm.position = current_position;
    end loop;
  end loop;

  first_round_matches := bracket_size / 2;
  for current_position in 1..first_round_matches loop
    player_one := shuffled_players[current_position];
    player_two := shuffled_players[current_position + first_round_matches];
    winner := null;

    if player_one is not null and player_two is null then
      winner := player_one;
    elsif player_one is null and player_two is not null then
      winner := player_two;
    end if;

    update public.tournament_matches tm
    set
      player_one_id = player_one,
      player_two_id = player_two,
      winner_id = winner,
      status = case
        when winner is not null then 'bye'::public.tournament_match_status
        when player_one is not null and player_two is not null then 'ready'::public.tournament_match_status
        else 'pending'::public.tournament_match_status
      end
    where tm.tournament_id = generate_single_elimination_bracket.tournament_id
      and tm.round = 1
      and tm.position = current_position;

    if winner is not null then
      select next_match_id, next_slot
      into next_id, next_slot_value
      from public.tournament_matches tm
      where tm.tournament_id = generate_single_elimination_bracket.tournament_id
        and tm.round = 1
        and tm.position = current_position;

      update public.tournament_matches tm
      set
        player_one_id = case when next_slot_value = 1 then winner else player_one_id end,
        player_two_id = case when next_slot_value = 2 then winner else player_two_id end
      where tm.id = next_id;
    end if;
  end loop;

  update public.tournament_matches tm
  set status = 'ready'
  where tm.tournament_id = generate_single_elimination_bracket.tournament_id
    and tm.status = 'pending'
    and tm.player_one_id is not null
    and tm.player_two_id is not null;

  update public.tournament_entries te
  set seed = s.ordinality::integer
  from unnest(shuffled_players) with ordinality as s(profile_id, ordinality)
  where te.tournament_id = generate_single_elimination_bracket.tournament_id
    and te.profile_id = s.profile_id;

  update public.tournaments
  set status = 'Active', seeded_randomly = true
  where id = generate_single_elimination_bracket.tournament_id;

  return query
  select tm.id, tm.round, tm.position, tm.player_one_id, tm.player_two_id, tm.status
  from public.tournament_matches tm
  where tm.tournament_id = generate_single_elimination_bracket.tournament_id
  order by tm.round, tm.position;
end;
$$;

create or replace function public.admin_override_player_elo(
  profile_id uuid,
  singles_elo integer default null,
  doubles_elo integer default null
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_profile public.profiles%rowtype;
begin
  if auth.uid() is not null and not public.is_admin() then
    raise exception 'Only admins can override Elo' using errcode = '42501';
  end if;

  update public.profiles
  set
    singles_elo = coalesce(admin_override_player_elo.singles_elo, public.profiles.singles_elo),
    doubles_elo = coalesce(admin_override_player_elo.doubles_elo, public.profiles.doubles_elo),
    elo = coalesce(admin_override_player_elo.singles_elo, public.profiles.elo)
  where id = admin_override_player_elo.profile_id
  returning * into updated_profile;

  if not found then
    raise exception 'Profile not found' using errcode = '23503';
  end if;

  return updated_profile;
end;
$$;

create or replace function public.admin_upsert_active_theme(
  slug text,
  name text,
  description text default null,
  starts_at timestamptz default now(),
  ends_at timestamptz default (now() + interval '7 days'),
  multiplier_logic jsonb default '{}'::jsonb,
  is_active boolean default true,
  theme_id uuid default null
)
returns public.active_themes
language plpgsql
security definer
set search_path = public
as $$
declare
  row public.active_themes%rowtype;
begin
  if auth.uid() is not null and not public.is_admin() then
    raise exception 'Only admins can update theme config' using errcode = '42501';
  end if;

  insert into public.active_themes (
    slug,
    name,
    description,
    starts_at,
    ends_at,
    multiplier_logic,
    is_active,
    theme_id,
    created_by
  )
  values (
    lower(trim(admin_upsert_active_theme.slug)),
    admin_upsert_active_theme.name,
    admin_upsert_active_theme.description,
    admin_upsert_active_theme.starts_at,
    admin_upsert_active_theme.ends_at,
    coalesce(admin_upsert_active_theme.multiplier_logic, '{}'::jsonb),
    coalesce(admin_upsert_active_theme.is_active, true),
    admin_upsert_active_theme.theme_id,
    auth.uid()
  )
  on conflict (slug) do update
  set
    name = excluded.name,
    description = excluded.description,
    starts_at = excluded.starts_at,
    ends_at = excluded.ends_at,
    multiplier_logic = excluded.multiplier_logic,
    is_active = excluded.is_active,
    theme_id = excluded.theme_id
  returning * into row;

  return row;
end;
$$;

grant execute on function public.active_match_theme_config() to authenticated;
grant execute on function public.last_head_to_head_was_loss(public.match_mode, uuid, uuid, uuid, uuid) to authenticated;
grant execute on function public.doubles_new_partner_multiplier(uuid, uuid) to authenticated;
grant execute on function public.resolve_match_multiplier(public.match_mode, uuid, uuid, uuid, uuid, numeric) to authenticated;
grant execute on function public.record_match_v2(public.match_mode, uuid, uuid, integer, integer, uuid, uuid, numeric, uuid) to authenticated;
grant execute on function public.record_singles_match(uuid, uuid, integer, integer, numeric) to authenticated;
grant execute on function public.record_doubles_match(uuid, uuid, uuid, uuid, integer, integer, numeric) to authenticated;
grant execute on function public.record_tournament_match(uuid, uuid, uuid, integer, integer, numeric) to authenticated;
grant execute on function public.generate_single_elimination_bracket(uuid, text) to authenticated;
grant execute on function public.admin_override_player_elo(uuid, integer, integer) to authenticated;
grant execute on function public.admin_upsert_active_theme(text, text, text, timestamptz, timestamptz, jsonb, boolean, uuid) to authenticated;
