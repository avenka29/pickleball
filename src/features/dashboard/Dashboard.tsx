import { Clock3, Gamepad2, Medal, Plus, Trophy, Users } from "lucide-react";
import type { ReactNode } from "react";
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
  const [activePage, setActivePage] = useState("home");
  const activeTheme = useActiveTheme();
  const players = usePlayers();
  const leaderboard = useLeaderboard(8, rankingTrack);
  const recentMatches = useRecentMatches(12);
  const tournaments = useTournaments();
  const openTournament = tournaments.data?.[0];

  return (
    <AppShell profile={auth.profile} activePage={activePage} onPageChange={setActivePage}>
      <main className="px-4 py-5 lg:px-8 lg:py-7">
        <div className="mx-auto max-w-dashboard">
          {activePage === "home" ? (
            <div className="page-stack">
              <ArcadeHud
                playerName={auth.profile?.display_name ?? auth.profile?.email ?? "Club player"}
                playerCount={players.data?.length ?? 0}
                matchCount={recentMatches.data?.length ?? 0}
              />
              <ThemeStrip theme={activeTheme.data} />
              <div className="home-board">
                <div className="space-y-5">
                  <RatingCard profile={auth.profile} />
                  <QuickActions onPageChange={setActivePage} />
                </div>
                <LeaderboardPreview
                  players={leaderboard.data ?? []}
                  isLoading={leaderboard.isLoading}
                  track={rankingTrack}
                  onTrackChange={setRankingTrack}
                  compact
                />
                <RecentMatchesList
                  matches={(recentMatches.data ?? []).slice(0, 5)}
                  isLoading={recentMatches.isLoading}
                  selectedMatchId={selectedMatchId}
                  onViewMatch={(match) => {
                    setSelectedMatchId(match.id);
                    setActivePage("history");
                  }}
                  compact
                />
              </div>
            </div>
          ) : null}

          {activePage === "record" ? (
            <div className="page-stack">
              <PageTitle title="Record Match" eyebrow="Score terminal" />
              <div className="record-room">
                <MatchEntryForm players={players.data ?? []} activeTheme={activeTheme.data} tournaments={tournaments.data ?? []} />
                <div className="space-y-5">
                  <ThemeStrip theme={activeTheme.data} />
                  <FlowPanel
                    title="Match flow"
                    items={["Pick match mode", "Choose unique players", "Set the winner", "Save once"]}
                  />
                </div>
              </div>
            </div>
          ) : null}

          {activePage === "rankings" ? (
            <div className="page-stack">
              <PageTitle title="Rankings" eyebrow="Singles and doubles ladder" />
              <div className="rankings-room">
                <LeaderboardPreview
                  players={leaderboard.data ?? []}
                  isLoading={leaderboard.isLoading}
                  track={rankingTrack}
                  onTrackChange={setRankingTrack}
                />
                <ProfileAnalytics profile={auth.profile} track={rankingTrack} />
              </div>
            </div>
          ) : null}

          {activePage === "history" ? (
            <div className="page-stack">
              <PageTitle title="Match History" eyebrow="Scorecards and replay room" />
              <div className="history-room">
                <RecentMatchesList
                  matches={recentMatches.data ?? []}
                  isLoading={recentMatches.isLoading}
                  selectedMatchId={selectedMatchId}
                  onViewMatch={(match) => setSelectedMatchId((current) => (current === match.id ? null : match.id))}
                />
              </div>
            </div>
          ) : null}

          {activePage === "tournaments" ? (
            <div className="page-stack">
              <PageTitle title="Bracket Board" eyebrow="Single-elimination nights" />
              <TournamentBoard tournamentName={openTournament?.name ?? null} isOpen={Boolean(openTournament)} />
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
    </AppShell>
  );
}

function QuickActions({ onPageChange }: { onPageChange: (page: string) => void }) {
  return (
    <RetroPanel className="quick-console p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="font-display text-3xl leading-none text-deep-green">Choose Your Move</h2>
        <Badge tone="rank">Start</Badge>
      </div>
      <div className="quick-grid">
        <button type="button" onClick={() => onPageChange("record")}>
          <Plus size={18} />
          Record match
        </button>
        <button type="button" onClick={() => onPageChange("rankings")}>
          <Medal size={18} />
          View ladder
        </button>
        <button type="button" onClick={() => onPageChange("history")}>
          <Clock3 size={18} />
          Match room
        </button>
        <button type="button" onClick={() => onPageChange("tournaments")}>
          <Trophy size={18} />
          Brackets
        </button>
      </div>
    </RetroPanel>
  );
}

function FlowPanel({ title, items }: { title: string; items: string[] }) {
  return (
    <RetroPanel className="flow-panel p-5">
      <h2 className="mb-4 font-display text-2xl text-deep-green">{title}</h2>
      <ol className="space-y-3">
        {items.map((item, index) => (
          <li key={item}>
            <span>{index + 1}</span>
            {item}
          </li>
        ))}
      </ol>
    </RetroPanel>
  );
}

function TournamentBoard({ tournamentName, isOpen }: { tournamentName: string | null; isOpen: boolean }) {
  const bracketSlots = ["Seed 1", "Seed 8", "Seed 4", "Seed 5", "Seed 2", "Seed 7", "Seed 3", "Seed 6"];

  return (
    <RetroPanel strong className="bracket-board p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-display text-4xl leading-none text-deep-green">
            <Trophy size={26} />
            {tournamentName ?? "No bracket loaded"}
          </h2>
          <p className="mt-1 font-bold text-ink">
            {isOpen ? "Players can be seeded into the next elimination board." : "Open a tournament to light up the bracket board."}
          </p>
        </div>
        <Badge tone={isOpen ? "win" : "provisional"}>{isOpen ? "Open" : "Waiting"}</Badge>
      </div>
      <div className="bracket-grid" aria-label="Tournament bracket preview">
        <div className="bracket-column">
          {bracketSlots.map((slot) => (
            <div key={slot} className="bracket-slot">{slot}</div>
          ))}
        </div>
        <div className="bracket-column bracket-column-mid">
          {["Quarter winner", "Quarter winner", "Quarter winner", "Quarter winner"].map((slot, index) => (
            <div key={`${slot}-${index}`} className="bracket-slot is-empty">{slot}</div>
          ))}
        </div>
        <div className="bracket-column bracket-column-final">
          {["Finalist", "Finalist", "Champion"].map((slot, index) => (
            <div key={`${slot}-${index}`} className={`bracket-slot ${index === 2 ? "is-champion" : "is-empty"}`}>{slot}</div>
          ))}
        </div>
      </div>
    </RetroPanel>
  );
}

function ArcadeHud({ playerName, playerCount, matchCount }: { playerName: string; playerCount: number; matchCount: number }) {
  return (
    <section className="arcade-hud">
      <div className="min-w-0">
        <p className="hud-kicker">Tonight's cabinet</p>
        <h1 className="truncate font-display text-4xl leading-none text-warm-white sm:text-5xl">{playerName}</h1>
        <p className="mt-2 max-w-xl font-black text-cream">Pick the next play, punch in the score, and climb the clubhouse ladder.</p>
      </div>
      <div className="hud-stats">
        <HudStat icon={<Gamepad2 size={18} />} label="Cabinet" value="Live" />
        <HudStat icon={<Users size={18} />} label="Roster" value={playerCount} />
        <HudStat icon={<Trophy size={18} />} label="Replays" value={matchCount} />
      </div>
    </section>
  );
}

function HudStat({ icon, label, value }: { icon: ReactNode; label: string; value: string | number }) {
  return (
    <div className="hud-stat">
      <div className="text-pickle-yellow">{icon}</div>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
      </div>
    </div>
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
