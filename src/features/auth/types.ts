import type { Session, User } from "@supabase/supabase-js";
import type { Profile } from "../../types/database.types";

export type ProfileRow = Profile & {
  singles_elo?: number | null;
  doubles_elo?: number | null;
  singles_matches_played?: number | null;
  doubles_matches_played?: number | null;
  singles_wins?: number | null;
  singles_losses?: number | null;
  doubles_wins?: number | null;
  doubles_losses?: number | null;
};

export type AuthState = {
  session: Session | null;
  user: User | null;
  profile: ProfileRow | null;
};
