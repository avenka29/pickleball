import { Trophy } from "lucide-react";
import { useState } from "react";
import { Badge } from "../../components/Badge";
import { RetroPanel } from "../../components/RetroPanel";
import type { AuthState } from "../auth/types";
import { AdminControls } from "./AdminControls";
import { AppShell } from "./AppShell";
import { useActiveTheme, useLeaderboard, usePlayers, useRecentMatches, useTournaments } from "./api";
import { LeaderboardPreview } from "./LeaderboardPreview";
import { MatchEntryForm } from "./MatchEntryForm";
import { ProfileAnalytics } from "./ProfileAnalytics";
import { RatingCard } from "./RatingCard";
import { RecentMatchesList } from "./RecentMatchesList";
import { ThemeStrip } from "./ThemeStrip";
import type { RankingTrack } from "./types";

type DashboardProps = {
  auth: AuthState;
};

export function Dashboard({ auth }: DashboardProps) {
  const [rankingTrack, setRankingTrack] = useState<RankingTrack>("singles");
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const activeTheme = useActiveTheme();
  const players = usePlayers();
  const leaderboard = useLeaderboard(8, rankingTrack);
  const recentMatches = useRecentMatches(12);
  const tournaments = useTournaments();
  const openTournament = tournaments.data?.[0];

  return (
    <AppShell profile={auth.profile}>
      <main className="px-4 py-5 lg:px-8 lg:py-7">
        <div className="mx-auto max-w-dashboard space-y-5">
          <section id="dashboard" className="dashboard-hero">
            <ThemeStrip theme={activeTheme.data} />
          </section>

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_392px]">
            <div className="space-y-5">
              <section id="matches">
                <MatchEntryForm players={players.data ?? []} activeTheme={activeTheme.data} tournaments={tournaments.data ?? []} />
              </section>
              <section id="match-history">
                <RecentMatchesList
                  matches={recentMatches.data ?? []}
                  isLoading={recentMatches.isLoading}
                  selectedMatchId={selectedMatchId}
                  onViewMatch={(match) => setSelectedMatchId((current) => (current === match.id ? null : match.id))}
                />
              </section>
              <ProfileAnalytics profile={auth.profile} track={rankingTrack} />
            </div>

            <div className="space-y-5">
              <RatingCard profile={auth.profile} />
              <section id="leaderboard">
                <LeaderboardPreview
                  players={leaderboard.data ?? []}
                  isLoading={leaderboard.isLoading}
                  track={rankingTrack}
                  onTrackChange={setRankingTrack}
                />
              </section>
              <section id="tournaments">
                <RetroPanel className="p-5">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h2 className="flex items-center gap-2 font-display text-2xl text-deep-green">
                      <Trophy size={23} />
                      Tournament
                    </h2>
                    <Badge tone="provisional">{openTournament ? "Open" : "Waiting"}</Badge>
                  </div>
                  <p className="font-bold text-ink">
                    {openTournament
                      ? `${openTournament.name ?? "Next bracket"} is ready for signups and match reporting.`
                      : "No active bracket is open right now."}
                  </p>
                </RetroPanel>
              </section>
              {auth.profile?.role === "admin" ? (
                <section id="admin">
                  <AdminControls players={players.data ?? []} />
                </section>
              ) : null}
            </div>
          </div>
        </div>
      </main>
    </AppShell>
  );
}
