import { LogIn, LogOut } from "lucide-react";
import type { ReactNode } from "react";
import { Badge } from "../../components/Badge";
import { RetroButton } from "../../components/RetroButton";
import { RetroPanel } from "../../components/RetroPanel";
import { useCurrentProfile, useSessionQuery, useSignInWithGoogle, useSignOut } from "./api";
import type { AuthState } from "./types";

type AuthGateProps = {
  children: (state: AuthState) => ReactNode;
};

export function AuthGate({ children }: AuthGateProps) {
  const sessionQuery = useSessionQuery();
  const session = sessionQuery.data ?? null;
  const profileQuery = useCurrentProfile(session?.user.id);
  const signIn = useSignInWithGoogle();
  const signOut = useSignOut();

  if (sessionQuery.isLoading) {
    return <div className="grid min-h-screen place-items-center bg-cream text-deep-green">Loading clubhouse...</div>;
  }

  if (!session) {
    return (
      <main className="min-h-screen bg-cream px-4 py-8 text-ink">
        <section className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-5xl items-center">
          <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div className="space-y-5">
              <Badge tone="theme">Private Clubhouse</Badge>
              <h1 className="font-display text-5xl leading-none text-deep-green sm:text-6xl">Pickleball ladder</h1>
              <p className="max-w-xl text-lg font-semibold text-ink">
                A warm, fast scoreboard for trusted players to record matches, watch ratings, and keep tournament nights tidy.
              </p>
              <RetroButton onClick={() => signIn.mutate()} disabled={signIn.isPending} className="gap-2">
                <LogIn size={20} />
                {signIn.isPending ? "Opening Google..." : "Sign in with Google"}
              </RetroButton>
              {signIn.error ? <p className="text-sm font-bold text-clay-red">{signIn.error.message}</p> : null}
            </div>

            <RetroPanel strong className="relative overflow-hidden p-6">
              <div className="court-lines" aria-hidden="true" />
              <div className="relative space-y-4">
                <div className="score-display inline-flex px-5 py-3 text-5xl">1200</div>
                <h2 className="font-display text-3xl text-deep-green">Tuesday night ranking</h2>
                <p className="font-semibold text-ink">
                  Google sign-in is gated by the Supabase whitelist, so only approved group members can reach match entry.
                </p>
              </div>
            </RetroPanel>
          </div>
        </section>
      </main>
    );
  }

  if (profileQuery.isError) {
    return (
      <main className="grid min-h-screen place-items-center bg-cream px-4">
        <RetroPanel strong className="max-w-lg p-6">
          <Badge tone="loss">Access check failed</Badge>
          <h1 className="mt-4 font-display text-3xl text-deep-green">Profile unavailable</h1>
          <p className="mt-2 font-semibold text-ink">
            Your Google account signed in, but the app profile could not be loaded. You may need to be added to the whitelist.
          </p>
          <div className="mt-5">
            <RetroButton variant="secondary" onClick={() => signOut.mutate()} className="gap-2">
              <LogOut size={18} />
              Sign out
            </RetroButton>
          </div>
        </RetroPanel>
      </main>
    );
  }

  return children({
    session,
    user: session.user,
    profile: profileQuery.data ?? null,
  });
}
