create or replace function public.recalculate_all_ratings()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  replay_match public.matches%rowtype;
  replay_bucket text;
  replay_multiplier numeric;
  winner_profile public.profiles%rowtype;
  loser_profile public.profiles%rowtype;
  winner_partner_profile public.profiles%rowtype;
  loser_partner_profile public.profiles%rowtype;
  winner_team_before numeric;
  loser_team_before numeric;
begin
  delete from public.match_participants;

  update public.profiles
  set
    elo = null,
    matches_played = 0,
    wins = 0,
    losses = 0,
    singles_elo = null,
    singles_matches_played = 0,
    singles_wins = 0,
    singles_losses = 0,
    doubles_elo = null,
    doubles_matches_played = 0,
    doubles_wins = 0,
    doubles_losses = 0,
    updated_at = now();

  for replay_match in
    select *
    from public.matches
    order by played_at asc, created_at asc, id asc
  loop
    replay_bucket := case when replay_match.mode = 'doubles' then 'doubles' else 'singles' end;
    replay_multiplier := coalesce(replay_match.multiplier, 1::numeric);

    select * into winner_profile
    from public.profiles
    where id = replay_match.winner_id;

    if not found then
      raise exception 'Cannot recalculate ratings: missing winner profile %', replay_match.winner_id using errcode = '23503';
    end if;

    select * into loser_profile
    from public.profiles
    where id = replay_match.loser_id;

    if not found then
      raise exception 'Cannot recalculate ratings: missing loser profile %', replay_match.loser_id using errcode = '23503';
    end if;

    if replay_match.mode = 'doubles' then
      select * into winner_partner_profile
      from public.profiles
      where id = replay_match.winner_partner_id;

      if not found then
        raise exception 'Cannot recalculate ratings: missing winner partner profile %', replay_match.winner_partner_id using errcode = '23503';
      end if;

      select * into loser_partner_profile
      from public.profiles
      where id = replay_match.loser_partner_id;

      if not found then
        raise exception 'Cannot recalculate ratings: missing loser partner profile %', replay_match.loser_partner_id using errcode = '23503';
      end if;

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

    update public.matches
    set
      rating_bucket = replay_bucket,
      winner_team_elo_before = winner_team_before,
      loser_team_elo_before = loser_team_before
    where id = replay_match.id;

    perform *
    from public.apply_player_rating_result(
      replay_match.winner_id,
      replay_bucket,
      'win',
      loser_team_before,
      replay_multiplier,
      replay_match.id,
      replay_match.mode,
      'winner',
      replay_match.winner_partner_id,
      winner_team_before,
      replay_match.winner_score,
      replay_match.loser_score
    );

    if replay_match.mode = 'doubles' then
      perform *
      from public.apply_player_rating_result(
        replay_match.winner_partner_id,
        replay_bucket,
        'win',
        loser_team_before,
        replay_multiplier,
        replay_match.id,
        replay_match.mode,
        'winner',
        replay_match.winner_id,
        winner_team_before,
        replay_match.winner_score,
        replay_match.loser_score
      );
    end if;

    perform *
    from public.apply_player_rating_result(
      replay_match.loser_id,
      replay_bucket,
      'loss',
      winner_team_before,
      replay_multiplier,
      replay_match.id,
      replay_match.mode,
      'loser',
      replay_match.loser_partner_id,
      loser_team_before,
      replay_match.winner_score,
      replay_match.loser_score
    );

    if replay_match.mode = 'doubles' then
      perform *
      from public.apply_player_rating_result(
        replay_match.loser_partner_id,
        replay_bucket,
        'loss',
        winner_team_before,
        replay_multiplier,
        replay_match.id,
        replay_match.mode,
        'loser',
        replay_match.loser_id,
        loser_team_before,
        replay_match.winner_score,
        replay_match.loser_score
      );
    end if;
  end loop;
end;
$$;

revoke all on function public.recalculate_all_ratings() from public, anon, authenticated;

create or replace function public.delete_match_and_recalculate(p_match_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_match public.matches%rowtype;
begin
  if auth.uid() is null or not public.is_whitelisted() then
    raise exception 'Only whitelisted authenticated users can delete matches' using errcode = '42501';
  end if;

  select * into deleted_match
  from public.matches
  where id = p_match_id
  for update;

  if not found then
    raise exception 'Match not found' using errcode = '23503';
  end if;

  delete from public.matches
  where id = p_match_id;

  if deleted_match.tournament_match_id is not null then
    update public.tournament_matches
    set
      winner_id = null,
      match_id = null,
      status = 'ready'
    where id = deleted_match.tournament_match_id;
  end if;

  perform public.recalculate_all_ratings();
end;
$$;

grant execute on function public.delete_match_and_recalculate(uuid) to authenticated;
