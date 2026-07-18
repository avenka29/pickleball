export type ProfileRole = "player" | "admin";
export type MatchResult = "win" | "loss";
export type MatchMode = "singles" | "doubles" | "tournament";
export type RatingBucket = "singles" | "doubles";
export type TournamentStatus =
  | "draft"
  | "open"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "Drafting"
  | "Active"
  | "Completed";
export type TournamentFormat = "single_elimination";
export type TournamentMatchStatus = "pending" | "bye" | "ready" | "completed";

export interface Profile {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  role: ProfileRole;
  elo: number | null;
  singles_elo: number | null;
  doubles_elo: number | null;
  matches_played: number;
  singles_matches_played: number;
  doubles_matches_played: number;
  wins: number;
  losses: number;
  singles_wins: number;
  singles_losses: number;
  doubles_wins: number;
  doubles_losses: number;
  created_at: string;
  updated_at: string;
}

export interface WhitelistEntry {
  id: string;
  email: string;
  role_on_signup: ProfileRole;
  note: string | null;
  created_at: string;
  revoked_at: string | null;
}

export interface Theme {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  starts_at: string;
  ends_at: string;
  rule_type: string;
  rule_config: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
}

export interface ActiveTheme {
  id: string;
  theme_id: string | null;
  name: string;
  slug: string;
  description: string | null;
  starts_at: string;
  ends_at: string;
  multiplier_logic: Record<string, unknown>;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Match {
  id: string;
  mode: MatchMode;
  winner_id: string;
  winner_partner_id: string | null;
  loser_id: string;
  loser_partner_id: string | null;
  winner_score: number | null;
  loser_score: number | null;
  theme_id: string | null;
  active_theme_id: string | null;
  multiplier: number;
  created_by: string | null;
  tournament_id: string | null;
  tournament_match_id: string | null;
  rating_bucket: RatingBucket;
  winner_team_elo_before: number | null;
  loser_team_elo_before: number | null;
  played_at: string;
  created_at: string;
}

export interface MatchParticipant {
  id: string;
  match_id: string;
  profile_id: string;
  result: MatchResult;
  mode: MatchMode;
  rating_bucket: RatingBucket;
  team: "winner" | "loser" | null;
  partner_id: string | null;
  team_elo_before: number | null;
  elo_before: number | null;
  elo_after: number | null;
  elo_delta: number;
  created_at: string;
}

export interface Tournament {
  id: string;
  name: string;
  description: string | null;
  format: TournamentFormat;
  status: TournamentStatus;
  max_entries: number | null;
  starts_at: string | null;
  seeded_randomly: boolean;
  winner_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface TournamentEntry {
  id: string;
  tournament_id: string;
  profile_id: string;
  seed: number | null;
  is_bye: boolean;
  eliminated_at: string | null;
  created_at: string;
}

export interface TournamentMatch {
  id: string;
  tournament_id: string;
  match_id: string | null;
  round: number;
  position: number;
  player_one_id: string | null;
  player_two_id: string | null;
  winner_id: string | null;
  next_match_id: string | null;
  next_slot: 1 | 2 | null;
  status: TournamentMatchStatus;
  created_at: string;
  updated_at: string;
}

export interface RecordMatchArgs {
  winner_id: string;
  loser_id: string;
  winner_score: number | null;
  loser_score: number | null;
  multiplier?: number | null;
}

export type RecordSinglesMatchArgs = RecordMatchArgs;

export interface RecordDoublesMatchArgs {
  winner_id: string;
  winner_partner_id: string;
  loser_id: string;
  loser_partner_id: string;
  winner_score: number | null;
  loser_score: number | null;
  multiplier?: number | null;
}

export interface RecordTournamentMatchArgs {
  tournament_match_id: string;
  winner_id: string;
  loser_id: string;
  winner_score: number | null;
  loser_score: number | null;
  multiplier?: number | null;
}

export interface RecordMatchResult {
  match_id: string;
  theme_id: string | null;
  applied_multiplier: number;
  winner_elo_before: number | null;
  winner_elo_after: number | null;
  winner_delta: number;
  loser_elo_before: number | null;
  loser_elo_after: number | null;
  loser_delta: number;
}

export interface RecordDoublesMatchResult extends RecordMatchResult {
  active_theme_id: string | null;
  winner_partner_elo_before: number | null;
  winner_partner_elo_after: number | null;
  winner_partner_delta: number;
  loser_partner_elo_before: number | null;
  loser_partner_elo_after: number | null;
  loser_partner_delta: number;
}

export interface RecordTournamentMatchResult extends RecordMatchResult {
  active_theme_id: string | null;
}

export interface GenerateSingleEliminationBracketArgs {
  tournament_id: string;
  random_seed?: string | null;
}

export interface GeneratedBracketMatch {
  tournament_match_id: string;
  round: number;
  bracket_position: number;
  player_one_id: string | null;
  player_two_id: string | null;
  status: TournamentMatchStatus;
}

export interface AddUserRequest {
  action?: "add_user";
  email: string;
  roleOnSignup?: ProfileRole;
  note?: string;
}

export interface AddUserResponse {
  data: WhitelistEntry;
}

export interface AdminOverrideEloRequest {
  action: "override_elo";
  profileId: string;
  singlesElo?: number | null;
  doublesElo?: number | null;
}

export interface AdminUpdateThemeConfigRequest {
  action: "update_theme_config";
  slug: string;
  name: string;
  description?: string | null;
  startsAt?: string | null;
  endsAt?: string | null;
  multiplierLogic?: Record<string, unknown>;
  isActive?: boolean;
  themeId?: string | null;
}
