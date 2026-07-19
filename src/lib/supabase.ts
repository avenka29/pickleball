import { createClient } from "@supabase/supabase-js";
import type {
  Match,
  MatchParticipant,
  ActiveTheme,
  RecordDoublesMatchResult,
  RecordMatchResult,
  RecordTournamentMatchResult,
  Profile,
  Theme,
  Tournament,
  TournamentEntry,
  TournamentMatch,
  WhitelistEntry,
} from "../types/database.types";

type Table<Row> = {
  Row: Row;
  Insert: Partial<Row>;
  Update: Partial<Row>;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      profiles: Table<Profile>;
      whitelist: Table<WhitelistEntry>;
      matches: Table<Match>;
      match_participants: Table<MatchParticipant>;
      themes: Table<Theme>;
      active_themes: Table<ActiveTheme>;
      tournaments: Table<Tournament>;
      tournament_entries: Table<TournamentEntry>;
      tournament_matches: Table<TournamentMatch>;
    };
    Views: Record<string, never>;
    Functions: {
      record_match: {
        Args: {
          winner_id: string;
          loser_id: string;
          winner_score: number | null;
          loser_score: number | null;
          multiplier?: number | null;
        };
        Returns: RecordMatchResult;
      };
      record_singles_match: {
        Args: {
          winner_id: string;
          loser_id: string;
          winner_score: number | null;
          loser_score: number | null;
          multiplier?: number | null;
        };
        Returns: RecordMatchResult;
      };
      record_doubles_match: {
        Args: {
          winner_id: string;
          winner_partner_id: string;
          loser_id: string;
          loser_partner_id: string;
          winner_score: number | null;
          loser_score: number | null;
          multiplier?: number | null;
        };
        Returns: RecordDoublesMatchResult;
      };
      record_tournament_match: {
        Args: {
          tournament_match_id: string;
          winner_id: string;
          loser_id: string;
          winner_score: number | null;
          loser_score: number | null;
          multiplier?: number | null;
        };
        Returns: RecordTournamentMatchResult;
      };
      bootstrap_current_profile: {
        Args: Record<string, never>;
        Returns: Profile;
      };
      delete_match_and_recalculate: {
        Args: {
          p_match_id: string;
        };
        Returns: void;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

const env = (import.meta as ImportMeta & { env: Record<string, string | undefined> }).env;
const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY");
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
