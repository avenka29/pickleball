import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../../lib/supabase";
import type { ProfileRow } from "./types";

export const authKeys = {
  session: ["auth", "session"] as const,
  profile: (userId?: string) => ["auth", "profile", userId ?? "anonymous"] as const,
};

export function useSessionQuery() {
  return useQuery({
    queryKey: authKeys.session,
    queryFn: async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      return data.session;
    },
  });
}

export function useCurrentProfile(userId?: string) {
  return useQuery({
    queryKey: authKeys.profile(userId),
    enabled: Boolean(userId),
    queryFn: async () => {
      const splitColumns =
        "id,email,display_name,avatar_url,role,elo,matches_played,wins,losses,created_at,updated_at,singles_elo,doubles_elo,singles_matches_played,doubles_matches_played,singles_wins,singles_losses,doubles_wins,doubles_losses";
      const baseColumns = "id,email,display_name,avatar_url,role,elo,matches_played,wins,losses,created_at,updated_at";
      let { data, error } = await supabase.from("profiles").select(splitColumns).eq("id", userId as string).single();

      if (error) {
        const fallback = await supabase.from("profiles").select(baseColumns).eq("id", userId as string).single();
        data = fallback.data;
        error = fallback.error;
      }

      if (error) {
        const bootstrap = await supabase.rpc("bootstrap_current_profile");
        if (bootstrap.error) throw bootstrap.error;

        const retry = await supabase.from("profiles").select(splitColumns).eq("id", userId as string).single();
        data = retry.data;
        error = retry.error;
      }

      if (error) throw error;
      if (!data) throw new Error("Profile not found.");
      return data as ProfileRow;
    },
  });
}

export function useSignInWithGoogle() {
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin,
        },
      });

      if (error) throw error;
    },
  });
}

export function useSignOut() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.clear();
    },
  });
}
