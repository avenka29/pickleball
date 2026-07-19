import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../../lib/supabase";
import type { ActiveTheme } from "../../types/database.types";
import type {
  LeaderboardPlayer,
  MatchEntryMode,
  RecentMatch,
  RecordMatchInput,
  RecordMatchResult,
  RatingTrendPoint,
  RankingTrack,
  Theme,
  TrackableProfile,
  TournamentReportInput,
  TournamentSummary,
} from "./types";

type RecordMatchRpcResponse = {
  match_id?: string;
  id?: string;
  winner_delta?: number | null;
  loser_delta?: number | null;
  applied_multiplier?: number | null;
  active_theme_id?: string | null;
  theme_id?: string | null;
};

type LooseQueryResult<T = unknown> = {
  data: T | null;
  error: { message?: string } | null;
};

type LooseQueryBuilder<T = unknown> = PromiseLike<LooseQueryResult<T>> & {
  select(columns?: string): LooseQueryBuilder<T>;
  update(values: Record<string, unknown>): LooseQueryBuilder<T>;
  insert(values: Record<string, unknown>): LooseQueryBuilder<T>;
  eq(column: string, value: unknown): LooseQueryBuilder<T>;
  lte(column: string, value: unknown): LooseQueryBuilder<T>;
  gte(column: string, value: unknown): LooseQueryBuilder<T>;
  order(column: string, options?: { ascending?: boolean }): LooseQueryBuilder<T>;
  limit(count: number): LooseQueryBuilder<T>;
  maybeSingle(): Promise<LooseQueryResult<T>>;
};

type LooseSupabase = {
  from(table: string): LooseQueryBuilder;
  rpc(functionName: string, args: Record<string, unknown>): Promise<LooseQueryResult>;
};

const looseSupabase = supabase as unknown as LooseSupabase;

export const dashboardKeys = {
  activeTheme: ["dashboard", "active-theme"] as const,
  leaderboard: ["dashboard", "leaderboard"] as const,
  leaderboardTrack: (track: RankingTrack, limit: number) => ["dashboard", "leaderboard", track, limit] as const,
  recentMatches: ["dashboard", "recent-matches"] as const,
  playerMatches: (profileId?: string, limit = 10) => ["dashboard", "player-matches", profileId ?? "none", limit] as const,
  ratingTrend: (profileId?: string, track?: RankingTrack) => ["dashboard", "rating-trend", profileId ?? "none", track ?? "all"] as const,
  tournaments: ["dashboard", "tournaments"] as const,
  tournamentDetail: (id?: string) => ["dashboard", "tournament", id ?? "none"] as const,
  players: ["dashboard", "players"] as const,
  whitelist: ["dashboard", "whitelist"] as const,
  themes: ["dashboard", "themes"] as const,
};

const baseProfileSelect = "id,display_name,avatar_url,elo,matches_played,wins,losses";
const splitProfileSelect =
  "id,display_name,avatar_url,elo,matches_played,wins,losses,singles_elo,doubles_elo,singles_matches_played,doubles_matches_played,singles_wins,singles_losses,doubles_wins,doubles_losses";

async function selectProfiles(selectColumns: string) {
  const { data, error } = await supabase.from("profiles").select(selectColumns).order("display_name", { ascending: true });
  return { data, error };
}

export function usePlayers() {
  return useQuery({
    queryKey: dashboardKeys.players,
    queryFn: async () => {
      let { data, error } = await selectProfiles(splitProfileSelect);
      if (error) {
        const fallback = await selectProfiles(baseProfileSelect);
        data = fallback.data;
        error = fallback.error;
      }
      if (error) throw error;
      return (data ?? []) as LeaderboardPlayer[];
    },
  });
}

export function useLeaderboard(limit = 8, track: RankingTrack = "singles") {
  return useQuery({
    queryKey: dashboardKeys.leaderboardTrack(track, limit),
    queryFn: async () => {
      let { data, error } = await selectProfiles(splitProfileSelect);
      if (error) {
        const fallback = await selectProfiles(baseProfileSelect);
        data = fallback.data;
        error = fallback.error;
      }

      if (error) throw error;
      return ((data ?? []) as LeaderboardPlayer[])
        .filter((player) => getTrackRating(player, track) != null)
        .sort((a, b) => Number(getTrackRating(b, track) ?? 0) - Number(getTrackRating(a, track) ?? 0))
        .slice(0, limit);
    },
  });
}

export function getTrackRating(player: LeaderboardPlayer | TrackableProfile | null | undefined, track: RankingTrack) {
  if (!player) return null;
  return track === "doubles" ? player.doubles_elo ?? player.elo ?? null : player.singles_elo ?? player.elo ?? null;
}

export function getTrackRecord(player: LeaderboardPlayer | TrackableProfile | null | undefined, track: RankingTrack) {
  if (!player) return { wins: 0, losses: 0, matches: 0 };
  if (track === "doubles") {
    return {
      wins: player.doubles_wins ?? player.wins ?? 0,
      losses: player.doubles_losses ?? player.losses ?? 0,
      matches: player.doubles_matches_played ?? player.matches_played ?? 0,
    };
  }
  return {
    wins: player.singles_wins ?? player.wins ?? 0,
    losses: player.singles_losses ?? player.losses ?? 0,
    matches: player.singles_matches_played ?? player.matches_played ?? 0,
  };
}

export function useRecentMatches(limit = 6) {
  return useQuery({
    queryKey: [...dashboardKeys.recentMatches, limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("matches")
        .select(
          "*,winner:profiles!matches_winner_id_fkey(id,display_name,avatar_url),loser:profiles!matches_loser_id_fkey(id,display_name,avatar_url),theme:themes(id,name,slug)",
        )
        .order("played_at", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return (data ?? []) as unknown as RecentMatch[];
    },
  });
}

export function usePlayerMatches(profileId?: string, limit = 10) {
  return useQuery({
    queryKey: dashboardKeys.playerMatches(profileId, limit),
    enabled: Boolean(profileId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("matches")
        .select(
          "*,winner:profiles!matches_winner_id_fkey(id,display_name,avatar_url),loser:profiles!matches_loser_id_fkey(id,display_name,avatar_url),theme:themes(id,name,slug)",
        )
        .or(`winner_id.eq.${profileId},loser_id.eq.${profileId}`)
        .order("played_at", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return (data ?? []) as unknown as RecentMatch[];
    },
  });
}

export function useRatingTrend(profileId?: string, track: RankingTrack = "singles") {
  return useQuery({
    queryKey: dashboardKeys.ratingTrend(profileId, track),
    enabled: Boolean(profileId),
    queryFn: async () => {
      const { data, error } = await looseSupabase
        .from("match_participants")
        .select("*")
        .eq("profile_id", profileId as string)
        .order("created_at", { ascending: true })
        .limit(18);

      if (error) throw error;
      return ((data ?? []) as RatingTrendPoint[]).filter((point) => {
        if (point.rating_bucket) return point.rating_bucket === track;
        if (point.match_type) return point.match_type === track;
        if (point.mode) return track === "doubles" ? point.mode === "doubles" : point.mode !== "doubles";
        return true;
      });
    },
  });
}

export function useActiveTheme() {
  return useQuery({
    queryKey: dashboardKeys.activeTheme,
    queryFn: async () => {
      const now = new Date().toISOString();
      const activeTheme = await looseSupabase
        .from("active_themes")
        .select("*")
        .eq("is_active", true)
        .lte("starts_at", now)
        .gte("ends_at", now)
        .order("starts_at", { ascending: false })
        .limit(1)
        .maybeSingle?.();

      if (activeTheme && !activeTheme.error && activeTheme.data) {
        const theme = activeTheme.data as ActiveTheme;
        return {
          id: theme.theme_id ?? theme.id,
          name: theme.name,
          slug: theme.slug,
          description: theme.description,
          starts_at: theme.starts_at,
          ends_at: theme.ends_at,
          rule_type: String(theme.multiplier_logic.type ?? "active_theme"),
          rule_config: theme.multiplier_logic,
          is_active: theme.is_active,
          created_at: theme.created_at,
        } as Theme;
      }

      const { data, error } = await supabase
        .from("themes")
        .select("id,name,slug,description,starts_at,ends_at,rule_type,rule_config,is_active,created_at")
        .eq("is_active", true)
        .lte("starts_at", now)
        .gte("ends_at", now)
        .order("starts_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as Theme | null;
    },
  });
}

export function useTournaments() {
  return useQuery({
    queryKey: dashboardKeys.tournaments,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tournaments")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) throw error;
      return (data ?? []) as TournamentSummary[];
    },
  });
}

export function useTournamentDetail(tournamentId?: string) {
  return useQuery({
    queryKey: dashboardKeys.tournamentDetail(tournamentId),
    enabled: Boolean(tournamentId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tournament_matches")
        .select("*")
        .eq("tournament_id", tournamentId as string)
        .order("round", { ascending: true });

      if (error) throw error;
      return data ?? [];
    },
  });
}

async function getRevengeMultiplier(winnerId: string, loserId: string, theme: Theme | null) {
  if (!theme || theme.slug !== "revenge-week") return 1;

  const { data, error } = await supabase
    .from("matches")
    .select("id")
    .eq("winner_id", loserId)
    .eq("loser_id", winnerId)
    .limit(1);

  if (error) throw error;
  return data && data.length > 0 ? 2 : 1;
}

export function useRecordMatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: RecordMatchInput): Promise<RecordMatchResult> => {
      const theme = queryClient.getQueryData<Theme | null>(dashboardKeys.activeTheme) ?? null;
      const multiplier = await getRevengeMultiplier(input.winnerId, input.loserId, theme);
      const mode = input.mode ?? "singles";

      if (mode === "doubles" && input.winnerTeam && input.loserTeam) {
        const doublesResult = await tryRecordDoublesMatch(input, multiplier, theme?.id ?? null);
        if (doublesResult) return doublesResult;
        throw new Error("Doubles match entry is ready, but the record_doubles_match RPC is not available yet.");
      }

      if (mode === "tournament" && input.tournamentMatchId && input.tournamentId) {
        const { data, error } = await looseSupabase.rpc("record_tournament_match", {
          tournament_match_id: input.tournamentMatchId,
          winner_id: input.winnerId,
          loser_id: input.loserId,
          winner_score: input.winnerScore,
          loser_score: input.loserScore,
          multiplier,
        });

        if (error) throw error;
        const rpcResult = (Array.isArray(data) ? data[0] : data) as RecordMatchRpcResponse | null;
        return {
          matchId: String(rpcResult?.match_id ?? rpcResult?.id ?? ""),
          winnerDelta: rpcResult?.winner_delta ?? null,
          loserDelta: rpcResult?.loser_delta ?? null,
          multiplier: rpcResult?.applied_multiplier ?? multiplier,
          themeId: rpcResult?.active_theme_id ?? rpcResult?.theme_id ?? theme?.id ?? input.themeId ?? null,
        };
      }

      const { data, error } = await looseSupabase.rpc("record_match", {
        winner_id: input.winnerId,
        loser_id: input.loserId,
        winner_score: input.winnerScore,
        loser_score: input.loserScore,
        multiplier,
      });

      if (error) throw error;

      const rpcResult = (Array.isArray(data) ? data[0] : data) as RecordMatchRpcResponse | null;
      const matchId = String(rpcResult?.match_id ?? rpcResult?.id ?? "");

      if (matchId && theme?.id) {
        const { error: themeUpdateError } = await looseSupabase
          .from("matches")
          .update({ theme_id: theme.id, multiplier })
          .eq("id", matchId);

        if (themeUpdateError) {
          console.warn("Match recorded, but theme metadata update was denied.", themeUpdateError);
        }
      }

      return {
        matchId,
        winnerDelta: rpcResult?.winner_delta ?? null,
        loserDelta: rpcResult?.loser_delta ?? null,
        multiplier,
        themeId: theme?.id ?? input.themeId ?? null,
      };
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: dashboardKeys.players });
      void queryClient.invalidateQueries({ queryKey: dashboardKeys.leaderboard });
      void queryClient.invalidateQueries({ queryKey: dashboardKeys.recentMatches });
      void queryClient.invalidateQueries({ queryKey: ["dashboard", "rating-trend"] });
      void queryClient.invalidateQueries({ queryKey: ["auth", "profile"] });
    },
  });
}

async function tryRecordDoublesMatch(input: RecordMatchInput, multiplier: number, themeId: string | null) {
  const { data, error } = await looseSupabase.rpc("record_doubles_match", {
    winner_id: input.winnerTeam?.[0],
    winner_partner_id: input.winnerTeam?.[1],
    loser_id: input.loserTeam?.[0],
    loser_partner_id: input.loserTeam?.[1],
    winner_score: input.winnerScore,
    loser_score: input.loserScore,
    multiplier,
  });

  if (error) {
    const message = String(error.message ?? "");
    if (message.includes("record_doubles_match") || message.includes("function") || message.includes("schema cache")) {
      return null;
    }
    throw error;
  }

  const rpcResult = (Array.isArray(data) ? data[0] : data) as RecordMatchRpcResponse | null;
  return {
    matchId: String(rpcResult?.match_id ?? rpcResult?.id ?? ""),
    winnerDelta: rpcResult?.winner_delta ?? null,
    loserDelta: rpcResult?.loser_delta ?? null,
    multiplier,
    themeId,
  };
}

export function useJoinTournament() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tournamentId: string) => {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!userData.user) throw new Error("You must be signed in to join a tournament.");

      const { error } = await looseSupabase.from("tournament_entries").insert({
        tournament_id: tournamentId,
        profile_id: userData.user.id,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: dashboardKeys.tournaments });
    },
  });
}

export function useWhitelist() {
  return useQuery({
    queryKey: dashboardKeys.whitelist,
    queryFn: async () => {
      const { data, error } = await supabase.from("whitelist").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useThemes() {
  return useQuery({
    queryKey: dashboardKeys.themes,
    queryFn: async () => {
      const activeThemes = await looseSupabase.from("active_themes").select("*").order("starts_at", { ascending: false }).limit(8);
      if (!activeThemes.error && activeThemes.data) {
        return ((activeThemes.data ?? []) as ActiveTheme[]).map((theme) => ({
          id: theme.id,
          name: theme.name,
          slug: theme.slug,
          description: theme.description,
          starts_at: theme.starts_at,
          ends_at: theme.ends_at,
          rule_type: String(theme.multiplier_logic.type ?? "active_theme"),
          rule_config: theme.multiplier_logic,
          is_active: theme.is_active,
          created_at: theme.created_at,
        })) as Theme[];
      }

      const { data, error } = await supabase.from("themes").select("*").order("starts_at", { ascending: false }).limit(8);
      if (error) throw error;
      return (data ?? []) as Theme[];
    },
  });
}

export function useAddWhitelistedUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { email: string; roleOnSignup: "player" | "admin"; note?: string }) => {
      const { data, error } = await looseSupabase.from("whitelist").insert({
        email: input.email.trim().toLowerCase(),
        role_on_signup: input.roleOnSignup,
        note: input.note || null,
        revoked_at: null,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: dashboardKeys.whitelist });
    },
  });
}

export function useOverrideElo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { profileId: string; track: RankingTrack; elo: number }) => {
      const { error } = await looseSupabase.rpc("admin_override_player_elo", {
        profile_id: input.profileId,
        singles_elo: input.track === "singles" ? input.elo : null,
        doubles_elo: input.track === "doubles" ? input.elo : null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: dashboardKeys.players });
      void queryClient.invalidateQueries({ queryKey: dashboardKeys.leaderboard });
    },
  });
}

export function useUpdateThemeConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      themeId: string;
      slug: string;
      name: string;
      description: string;
      startsAt: string;
      endsAt: string;
      ruleConfig: string;
      isActive: boolean;
    }) => {
      let ruleConfig: Record<string, unknown>;
      try {
        ruleConfig = input.ruleConfig.trim() ? JSON.parse(input.ruleConfig) : {};
      } catch {
        throw new Error("Theme config must be valid JSON.");
      }

      const { error } = await looseSupabase.rpc("admin_upsert_active_theme", {
        theme_id: input.themeId,
        slug: input.slug,
        name: input.name,
        description: input.description,
        starts_at: input.startsAt,
        ends_at: input.endsAt,
        multiplier_logic: ruleConfig,
        is_active: input.isActive,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: dashboardKeys.themes });
      void queryClient.invalidateQueries({ queryKey: dashboardKeys.activeTheme });
    },
  });
}

export function matchModeLabel(mode?: MatchEntryMode | "standard" | string | null) {
  if (mode === "doubles") return "Doubles";
  if (mode === "tournament") return "Tournament";
  return "Singles";
}

export function useReportTournamentMatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: TournamentReportInput) => {
      const { error } = await looseSupabase.rpc("record_tournament_match", {
        tournament_match_id: input.tournamentMatchId,
        winner_id: input.winnerId,
        loser_id: input.loserId,
        winner_score: input.winnerScore ?? null,
        loser_score: input.loserScore ?? null,
        multiplier: null,
      });
      if (error) throw error;
    },
    onSuccess: (_data, input) => {
      void queryClient.invalidateQueries({ queryKey: dashboardKeys.tournaments });
      void queryClient.invalidateQueries({ queryKey: dashboardKeys.tournamentDetail(input.tournamentId) });
    },
  });
}
