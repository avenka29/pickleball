-- Elo review: the existing expected-score term
--   expected = 1 / (1 + 10 ^ ((opponent_elo - player_elo) / 400))
--   delta    = round(32 * multiplier * (actual - expected))
-- already makes rating differences drive delta size correctly and symmetrically:
-- a big favorite winning yields a small positive delta for the winner and an
-- equally small negative delta for the loser (low information, expected result);
-- a big underdog winning yields a large delta both ways (high information,
-- upset). That part was verified correct and is left unchanged.
--
-- What was missing: the recorded score margin (how close the game was) had no
-- effect on delta size at all. This adds a bounded, logarithmic margin-of-victory
-- factor, applied identically to every participant in the match (it describes the
-- match, not any one player), multiplied alongside the existing expected-score
-- term rather than replacing it:
--
--   margin_factor(margin) = clamp(1 + 0.15 * ln(margin / 2), 0.85, 1.5)
--
-- margin = 2  (closest possible win-by-2 game) -> factor = 1.00 (baseline)
-- margin = 6  (comfortable win)                 -> factor ~= 1.16
-- margin = 11 (11-0 shutout)                    -> factor ~= 1.26
-- margin = 21 (21-0 shutout, longer game format) -> factor ~= 1.35 (capped well under the ceiling)
-- margin = 1  (uncapped 1-point win, if ever recorded) -> factor ~= 0.90
--
-- Missing/null scores (e.g. some tournament results) fall back to a neutral
-- factor of 1.0, matching prior behavior exactly. The margin is floored at 1
-- before taking ln() so a same-score edge case can never raise a math error.

drop function if exists public.apply_player_rating_result(uuid, text, text, numeric, numeric, uuid, public.match_mode, text, uuid, numeric);

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
  p_team_elo_before numeric,
  p_winner_score integer,
  p_loser_score integer
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
  margin integer;
  margin_factor numeric;
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

  if p_winner_score is null or p_loser_score is null then
    margin_factor := 1::numeric;
  else
    margin := greatest(abs(p_winner_score - p_loser_score), 1);
    margin_factor := greatest(0.85, least(1.5, 1 + 0.15 * ln(margin::numeric / 2)));
  end if;

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
    elo_delta := round(32 * margin_factor * case when actual = 1 then p_multiplier else 1::numeric end * (actual - expected))::integer;
    elo_after := seed_elo + elo_delta;
  elsif played >= 3 then
    expected := 1 / (1 + power(10::numeric, ((p_opponent_average - current_elo)::numeric / 400)));
    elo_delta := round(32 * margin_factor * case when actual = 1 then p_multiplier else 1::numeric end * (actual - expected))::integer;
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
    winner_team_before,
    p_winner_score,
    p_loser_score
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
      winner_team_before,
      p_winner_score,
      p_loser_score
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
    loser_team_before,
    p_winner_score,
    p_loser_score
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
      loser_team_before,
      p_winner_score,
      p_loser_score
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
