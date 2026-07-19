import { Trophy } from "lucide-react";
import { useState } from "react";
import { Badge } from "../../components/Badge";
import { RetroPanel } from "../../components/RetroPanel";
import type { AuthState } from "../auth/types";
import { AdminControls } from "./AdminControls";
import { AppShell } from "./AppShell";
import { useActiveTheme, useLeaderboard, usePlayers, useRecentMatches, useTournaments } from "./api";
import { LeaderboardPage } from "./LeaderboardPage";
import { LeaderboardPreview } from "./LeaderboardPreview";
import { MatchEntryForm } from "./MatchEntryForm";
import { PlayerProfileModal } from "./PlayerProfileModal";
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
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [activePage, setActivePage] = useState("dashboard");
  const activeTheme = useActiveTheme();
  const players = usePlayers();
  const leaderboard = useLeaderboard(5, rankingTrack);
  const recentMatches = useRecentMatches(12);
  const tournaments = useTournaments();
  const openTournament = tournaments.data?.[0];
  const selectedPlayer = players.data?.find((player) => player.id === selectedPlayerId) ?? null;

  return (
    <AppShell profile={auth.profile} activePage={activePage} onPageChange={setActivePage}>
      <main className="px-4 py-5 lg:px-8 lg:py-7">
        <div className="mx-auto max-w-dashboard">
          {activePage === "dashboard" ? (
            <div className="page-stack">
              <ThemeStrip theme={activeTheme.data} />
              <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_392px]">
                <MatchEntryForm players={players.data ?? []} activeTheme={activeTheme.data} tournaments={tournaments.data ?? []} />
                <div className="space-y-5">
                  <RatingCard profile={auth.profile} />
                  <ProfileAnalytics profile={auth.profile} track={rankingTrack} />
                  <LeaderboardPreview
                    players={leaderboard.data ?? []}
                    isLoading={leaderboard.isLoading}
                    track={rankingTrack}
                    onTrackChange={setRankingTrack}
                    onViewAll={() => setActivePage("leaderboard")}
                    onSelectPlayer={setSelectedPlayerId}
                  />
                </div>
              </div>
            </div>
          ) : null}

          {activePage === "leaderboard" ? (
            <div className="page-stack">
              <PageTitle title="Leaderboard" eyebrow="Singles and doubles ladder" />
              <LeaderboardPage
                players={players.data ?? []}
                isLoading={players.isLoading}
                track={rankingTrack}
                onTrackChange={setRankingTrack}
                onSelectPlayer={setSelectedPlayerId}
              />
            </div>
          ) : null}

          {activePage === "matches" ? (
            <div className="page-stack">
              <PageTitle title="Matches" eyebrow="Scorecards and recent results" />
              <div className="grid gap-5 xl:grid-cols-[minmax(0,520px)_1fr]">
                <MatchEntryForm players={players.data ?? []} activeTheme={activeTheme.data} tournaments={tournaments.data ?? []} />
                <RecentMatchesList
                  matches={recentMatches.data ?? []}
                  isLoading={recentMatches.isLoading}
                  selectedMatchId={selectedMatchId}
                  onViewMatch={(match) => setSelectedMatchId((current) => (current === match.id ? null : match.id))}
                  onSelectPlayer={setSelectedPlayerId}
                />
              </div>
            </div>
          ) : null}

          {activePage === "tournaments" ? (
            <div className="page-stack">
              <PageTitle title="Tournaments" eyebrow="Single-elimination nights" />
              <RetroPanel strong className="p-6">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h2 className="flex items-center gap-2 font-display text-3xl text-deep-green">
                    <Trophy size={26} />
                    Tournament board
                  </h2>
                  <Badge tone="provisional">{openTournament ? "Open" : "Waiting"}</Badge>
                </div>
                <p className="max-w-2xl font-bold text-ink">
                  {openTournament
                    ? `${openTournament.name ?? "Next bracket"} is ready for signups and match reporting.`
                    : "No active bracket is open right now."}
                </p>
              </RetroPanel>
            </div>
          ) : null}

          {activePage === "admin" && auth.profile?.role === "admin" ? (
            <div className="page-stack">
              <PageTitle title="Admin" eyebrow="Whitelist, ratings, and themes" />
              <AdminControls players={players.data ?? []} />
            </div>
          ) : null}
        </div>
      </main>

      <PlayerProfileModal player={selectedPlayer} track={rankingTrack} onClose={() => setSelectedPlayerId(null)} />
    </AppShell>
  );
}

function PageTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="page-title">
      <p className="text-sm font-black uppercase text-clay-red">{eyebrow}</p>
      <h1 className="font-display text-4xl leading-none text-deep-green sm:text-5xl">{title}</h1>
    </div>
  );
}
