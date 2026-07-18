create or replace function public.active_match_theme()
returns public.themes
language sql
stable
security definer
set search_path = public
as $$
  select t.*
  from public.themes t
  where t.is_active
    and now() >= t.starts_at
    and now() < t.ends_at
  order by t.starts_at desc
  limit 1;
$$;

create or replace function public.revenge_week_multiplier(
  p_winner_id uuid,
  p_loser_id uuid
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
      where m.winner_id = p_loser_id
        and m.loser_id = p_winner_id
    ) then 2::numeric
    else 1::numeric
  end;
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
language plpgsql
security definer
set search_path = public
as $$
declare
  winner_profile public.profiles%rowtype;
  loser_profile public.profiles%rowtype;
  active_theme public.themes%rowtype;
  effective_multiplier numeric;
  winner_before integer;
  loser_before integer;
  winner_after integer;
  loser_after integer;
  winner_change integer := 0;
  loser_change integer := 0;
  winner_expected numeric;
  loser_expected numeric;
  new_match_id uuid;
begin
  if auth.uid() is null or not public.is_whitelisted() then
    raise exception 'Only whitelisted authenticated users can record matches'
      using errcode = '42501';
  end if;

  if record_match.winner_id = record_match.loser_id then
    raise exception 'Winner and loser must be different players'
      using errcode = '23514';
  end if;

  if record_match.multiplier is not null and record_match.multiplier <= 0 then
    raise exception 'Multiplier must be greater than zero'
      using errcode = '23514';
  end if;

  select *
  into winner_profile
  from public.profiles p
  where p.id = record_match.winner_id
  for update;

  if not found then
    raise exception 'Winner profile not found'
      using errcode = '23503';
  end if;

  select *
  into loser_profile
  from public.profiles p
  where p.id = record_match.loser_id
  for update;

  if not found then
    raise exception 'Loser profile not found'
      using errcode = '23503';
  end if;

  select *
  into active_theme
  from public.active_match_theme();

  effective_multiplier := coalesce(record_match.multiplier, 1::numeric);

  if record_match.multiplier is null
    and active_theme.id is not null
    and active_theme.rule_type = 'revenge_week' then
    effective_multiplier := public.revenge_week_multiplier(record_match.winner_id, record_match.loser_id);
  end if;

  winner_before := winner_profile.elo;
  loser_before := loser_profile.elo;
  winner_after := winner_before;
  loser_after := loser_before;

  if winner_profile.matches_played = 2 then
    winner_after := 1200;
    winner_change := case when winner_before is null then 0 else winner_after - winner_before end;
  elsif winner_profile.matches_played >= 3 then
    winner_expected := 1 / (1 + power(10::numeric, ((coalesce(loser_profile.elo, 1200) - winner_profile.elo)::numeric / 400)));
    winner_change := round(32 * effective_multiplier * (1 - winner_expected))::integer;
    winner_after := winner_profile.elo + winner_change;
  end if;

  if loser_profile.matches_played = 2 then
    loser_after := 1200;
    loser_change := case when loser_before is null then 0 else loser_after - loser_before end;
  elsif loser_profile.matches_played >= 3 then
    loser_expected := 1 / (1 + power(10::numeric, ((coalesce(winner_profile.elo, 1200) - loser_profile.elo)::numeric / 400)));
    loser_change := round(32 * (0 - loser_expected))::integer;
    loser_after := loser_profile.elo + loser_change;
  end if;

  insert into public.matches (
    winner_id,
    loser_id,
    winner_score,
    loser_score,
    theme_id,
    multiplier,
    created_by
  )
  values (
    record_match.winner_id,
    record_match.loser_id,
    record_match.winner_score,
    record_match.loser_score,
    active_theme.id,
    effective_multiplier,
    auth.uid()
  )
  returning id into new_match_id;

  update public.profiles
  set
    elo = winner_after,
    matches_played = matches_played + 1,
    wins = wins + 1
  where id = record_match.winner_id;

  update public.profiles
  set
    elo = loser_after,
    matches_played = matches_played + 1,
    losses = losses + 1
  where id = record_match.loser_id;

  insert into public.match_participants (
    match_id,
    profile_id,
    result,
    elo_before,
    elo_after,
    elo_delta
  )
  values
    (
      new_match_id,
      record_match.winner_id,
      'win',
      winner_before,
      winner_after,
      winner_change
    ),
    (
      new_match_id,
      record_match.loser_id,
      'loss',
      loser_before,
      loser_after,
      loser_change
    );

  return query
  select
    new_match_id,
    active_theme.id,
    effective_multiplier,
    winner_before,
    winner_after,
    winner_change,
    loser_before,
    loser_after,
    loser_change;
end;
$$;

grant execute on function public.record_match(uuid, uuid, integer, integer, numeric) to authenticated;
grant execute on function public.revenge_week_multiplier(uuid, uuid) to authenticated;
grant execute on function public.active_match_theme() to authenticated;
