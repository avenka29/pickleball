-- apply_player_rating_result previously hard-reset a player's rating to a flat 1200
-- on their 3rd match (the one that ends provisional status), discarding the match
-- result and opponent strength entirely. That let a losing 3rd match land a player
-- at the same 1200 as a winning one, decoupling rating from record right at the
-- provisional/ranked boundary. This replaces the flat reset with a real Elo
-- calculation seeded from a 1200 baseline, so exiting provisional behaves like any
-- other rated match instead of a coin-flip reset.
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
  seed_elo constant integer := 1200;
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
    expected := 1 / (1 + power(10::numeric, ((p_opponent_average - seed_elo)::numeric / 400)));
    elo_delta := round(32 * case when actual = 1 then p_multiplier else 1::numeric end * (actual - expected))::integer;
    elo_after := seed_elo + elo_delta;
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
