import type {
  Match as DatabaseMatch,
  Profile as DatabaseProfile,
  Theme as DatabaseTheme,
  Tournament as DatabaseTournament,
  TournamentMatch as DatabaseTournamentMatch,
} from "../../types/database.types";

export type Profile = DatabaseProfile;
export type Theme = DatabaseTheme;
export type Match = DatabaseMatch;
export type Tournament = DatabaseTournament;
export type TournamentMatch = DatabaseTournamentMatch;

export type RankingTrack = "singles" | "doubles";
export type MatchEntryMode = "singles" | "doubles" | "tournament";

export type TrackableProfile = Profile & {
  singles_elo?: number | null;
  doubles_elo?: number | null;
  singles_matches_played?: number | null;
  doubles_matches_played?: number | null;
  singles_wins?: number | null;
  singles_losses?: number | null;
  doubles_wins?: number | null;
  doubles_losses?: number | null;
};

export type LeaderboardPlayer = Pick<
  TrackableProfile,
  "id" | "display_name" | "avatar_url" | "elo" | "matches_played" | "wins" | "losses"
> & {
  singles_elo?: number | null;
  doubles_elo?: number | null;
  singles_matches_played?: number | null;
  doubles_matches_played?: number | null;
  singles_wins?: number | null;
  singles_losses?: number | null;
  doubles_wins?: number | null;
  doubles_losses?: number | null;
  last_delta?: number | null;
  streak?: string | null;
};

export type RecentMatch = Match & {
  match_type?: MatchEntryMode | "standard" | null;
  mode?: MatchEntryMode | null;
  winner_team_player_one_id?: string | null;
  winner_team_player_two_id?: string | null;
  loser_team_player_one_id?: string | null;
  loser_team_player_two_id?: string | null;
  winner?: Pick<Profile, "id" | "display_name" | "avatar_url"> | null;
  loser?: Pick<Profile, "id" | "display_name" | "avatar_url"> | null;
  theme?: Pick<Theme, "id" | "name" | "slug"> | null;
  winner_delta?: number | null;
  loser_delta?: number | null;
};

export type RecordMatchInput = {
  mode?: MatchEntryMode;
  winnerId: string;
  loserId: string;
  winnerScore: number;
  loserScore: number;
  themeId?: string | null;
  winnerTeam?: [string, string];
  loserTeam?: [string, string];
  tournamentId?: string;
  tournamentMatchId?: string;
};

export type RecordMatchResult = {
  matchId: string;
  winnerDelta?: number | null;
  loserDelta?: number | null;
  multiplier: number;
  themeId?: string | null;
};

export type TournamentSummary = Tournament & {
  entry_count?: number;
};

export type TournamentReportInput = {
  tournamentId: string;
  tournamentMatchId: string;
  winnerId: string;
  loserId: string;
  winnerScore?: number | null;
  loserScore?: number | null;
};

export type RatingTrendPoint = {
  id: string;
  created_at: string;
  result?: "win" | "loss";
  mode?: MatchEntryMode | string | null;
  rating_bucket?: RankingTrack | string | null;
  elo_before?: number | null;
  elo_after?: number | null;
  elo_delta?: number | null;
  rating?: number | null;
  match_type?: MatchEntryMode | string | null;
};
