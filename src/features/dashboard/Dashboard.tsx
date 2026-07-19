import { Shuffle, UserPlus } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Badge } from "../../components/Badge";
import { RetroPanel } from "../../components/RetroPanel";
import type { AuthState } from "../auth/types";
import { AdminControls } from "./AdminControls";
import { AppShell } from "./AppShell";
import {
  useActiveTheme,
  useDeleteMatch,
  useLeaderboard,
  usePlayers,
  useRandomSeedTournament,
  useRecentMatches,
  useTournamentDetail,
  useTournamentEntries,
  useTournaments,
  getTrackRating,
  getTrackRecord,
} from "./api";
import { LeaderboardPreview } from "./LeaderboardPreview";
import { MatchEntryForm } from "./MatchEntryForm";
import { ProfileAnalytics } from "./ProfileAnalytics";
import { RecentMatchesList } from "./RecentMatchesList";
import type { LeaderboardPlayer, RankingTrack } from "./types";

type DashboardProps = {
  auth: AuthState;
};

export function Dashboard({ auth }: DashboardProps) {
  const [rankingTrack, setRankingTrack] = useState<RankingTrack>("singles");
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [activePage, setActivePage] = useState("home");
  const activeTheme = useActiveTheme();
  const players = usePlayers();
  const leaderboard = useLeaderboard(100, rankingTrack);
  const recentMatches = useRecentMatches(300);
  const tournaments = useTournaments();
  const deleteMatch = useDeleteMatch();

  return (
    <AppShell profile={auth.profile} activePage={activePage} onPageChange={setActivePage} activeTheme={activeTheme.data}>
      <main className="px-4 py-5 lg:px-8 lg:py-7">
        <div className="mx-auto max-w-dashboard">
          {activePage === "home" ? (
            <Room>
              <div className="home-combined">
                <HomePlayerBanner profile={auth.profile} players={leaderboard.data ?? []} track={rankingTrack} />
                <LeaderboardPreview
                  players={leaderboard.data ?? []}
                  isLoading={leaderboard.isLoading}
                  track={rankingTrack}
                  onTrackChange={setRankingTrack}
                  compact
                  title="Top 3"
                />
                <ProfileAnalytics profile={auth.profile} track={rankingTrack} simple />
              </div>
            </Room>
          ) : null}

          {activePage === "record" ? (
            <Room>
              <div className="record-layout">
                <MatchEntryForm players={players.data ?? []} activeTheme={activeTheme.data} tournaments={tournaments.data ?? []} />
              </div>
            </Room>
          ) : null}

          {activePage === "rankings" ? (
            <Room>
              <PageTitle title="Rankings" eyebrow="Singles and doubles tracks" />
              <div className="rankings-layout">
                <LeaderboardPreview
                  players={players.data ?? []}
                  isLoading={players.isLoading}
                  track={rankingTrack}
                  onTrackChange={setRankingTrack}
                />
              </div>
            </Room>
          ) : null}

          {activePage === "history" ? (
            <Room>
              <PageTitle title="Replay Feed" eyebrow="Match cards in reverse order" />
              <RecentMatchesList
                matches={recentMatches.data ?? []}
                isLoading={recentMatches.isLoading}
                selectedMatchId={selectedMatchId}
                onViewMatch={(match) => setSelectedMatchId((current) => (current === match.id ? null : match.id))}
                onDeleteMatch={(match) => deleteMatch.mutate(match.id)}
                deletingMatchId={deleteMatch.isPending ? deleteMatch.variables ?? null : null}
              />
            </Room>
          ) : null}

          {activePage === "tournaments" ? (
            <Room>
              <PageTitle title="Bracket Board" eyebrow="Single-elimination nights" />
              <TournamentBoard tournaments={tournaments.data ?? []} players={players.data ?? []} />
            </Room>
          ) : null}

          {activePage === "admin" && auth.profile?.role === "admin" ? (
            <Room>
              <PageTitle title="Admin Controls" eyebrow="Whitelist, ratings, themes" />
              <AdminControls players={players.data ?? []} />
            </Room>
          ) : null}
        </div>
      </main>
    </AppShell>
  );
}

function HomePlayerBanner({
  profile,
  players,
  track,
}: {
  profile: AuthState["profile"];
  players: LeaderboardPlayer[];
  track: RankingTrack;
}) {
  const rating = getTrackRating(profile, track);
  const record = getTrackRecord(profile, track);
  const rankIndex = players.findIndex((player) => player.id === profile?.id);
  const rankLabel = record.matches < 3 ? "Provisional" : rankIndex >= 0 ? `#${rankIndex + 1}` : "Rank pending";
  const displayName = profile?.display_name || profile?.email || "Player";

  return (
    <section className="home-player-banner" aria-label="Your current rating">
      <div className="home-player-banner-name">
        <h2>{displayName}</h2>
      </div>
      <div className="home-player-banner-stats">
        <div>
          <span>Rank</span>
          <strong>{rankLabel}</strong>
        </div>
        <div>
          <span>{track} Elo</span>
          <strong>{rating ?? "Provisional"}</strong>
        </div>
      </div>
      <BannerArt />
    </section>
  );
}

function BannerArt() {
  return (
    <svg className="home-banner-art" viewBox="0 0 150 150" aria-hidden="true" focusable="false">
      <circle cx="75" cy="75" r="58" fill="var(--color-yellow)" stroke="var(--color-charcoal)" strokeWidth="7" />
      <circle cx="54" cy="48" r="5" fill="var(--color-charcoal)" />
      <circle cx="78" cy="43" r="5" fill="var(--color-charcoal)" />
      <circle cx="101" cy="55" r="5" fill="var(--color-charcoal)" />
      <circle cx="47" cy="77" r="5" fill="var(--color-charcoal)" />
      <circle cx="75" cy="75" r="5" fill="var(--color-charcoal)" />
      <circle cx="105" cy="83" r="5" fill="var(--color-charcoal)" />
      <circle cx="61" cy="105" r="5" fill="var(--color-charcoal)" />
      <circle cx="91" cy="110" r="5" fill="var(--color-charcoal)" />
      <path d="M34 101 C52 119 91 126 119 96" fill="none" stroke="var(--color-cream)" strokeWidth="7" strokeLinecap="round" opacity="0.72" />
      <path d="M36 45 C57 24 94 24 116 47" fill="none" stroke="var(--color-cream)" strokeWidth="6" strokeLinecap="round" opacity="0.5" />
    </svg>
  );
}

function Room({ children }: { children: ReactNode }) {
  return <div className="room-slam page-stack">{children}</div>;
}

function TournamentBoard({ tournaments, players }: { tournaments: Array<{ id: string; name: string; status?: string | null }>; players: Array<{ id: string; display_name: string | null }> }) {
  const [selectedTournamentId, setSelectedTournamentId] = useState("");
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
  const entries = useTournamentEntries(selectedTournamentId);
  const matches = useTournamentDetail(selectedTournamentId);
  const seedTournament = useRandomSeedTournament();
  const selectedTournament = tournaments.find((tournament) => tournament.id === selectedTournamentId);
  const tournamentMatches = (matches.data ?? []) as Array<{
    id: string;
    round: number;
    status: string;
    player_one_id: string | null;
    player_two_id: string | null;
  }>;

  useEffect(() => {
    if (!selectedTournamentId && tournaments[0]) setSelectedTournamentId(tournaments[0].id);
  }, [selectedTournamentId, tournaments]);

  const togglePlayer = (playerId: string) => {
    setSelectedPlayerIds((current) => (current.includes(playerId) ? current.filter((id) => id !== playerId) : [...current, playerId]));
  };

  const seedBracket = () => {
    seedTournament.mutate({ tournamentId: selectedTournamentId, playerIds: selectedPlayerIds });
  };

  return (
    <RetroPanel strong className="bracket-board p-6">
      <div className="panel-heading">
        <div>
          <p>{selectedTournament ? "Tournament selected" : "No tournament"}</p>
          <h2>{selectedTournament?.name ?? "Choose a bracket"}</h2>
        </div>
        <Badge tone={selectedTournament ? "win" : "provisional"}>{selectedTournament?.status ?? "Waiting"}</Badge>
      </div>

      <div className="bracket-flow">
        <section className="bracket-step">
          <div className="step-title">
            <span>1</span>
            <div>
              <p>Add users</p>
              <h3>Choose players</h3>
            </div>
          </div>
          <select className="form-input" value={selectedTournamentId} onChange={(event) => setSelectedTournamentId(event.target.value)}>
            <option value="">Select tournament</option>
            {tournaments.map((tournament) => (
              <option key={tournament.id} value={tournament.id}>
                {tournament.name}
              </option>
            ))}
          </select>
          <div className="player-pick-grid" aria-label="Players to add">
            {players.map((player) => (
              <button key={player.id} type="button" className={selectedPlayerIds.includes(player.id) ? "is-selected" : ""} onClick={() => togglePlayer(player.id)}>
                <UserPlus size={16} />
                <span>{player.display_name || "Unnamed player"}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="bracket-step">
          <div className="step-title">
            <span>2</span>
            <div>
              <p>Random seed</p>
              <h3>Generate bracket</h3>
            </div>
          </div>
          <button type="button" className="cartoon-button is-primary w-full" disabled={!selectedTournamentId || selectedPlayerIds.length < 2 || seedTournament.isPending} onClick={seedBracket}>
            <Shuffle size={18} />
            {seedTournament.isPending ? "Seeding..." : `Random seed ${selectedPlayerIds.length || 0} players`}
          </button>
          {seedTournament.error ? <p className="form-alert is-danger">{seedTournament.error.message}</p> : null}
          <div className="seed-list">
            {(entries.data ?? []).length === 0 ? <p>No seeded players yet.</p> : null}
            {(entries.data ?? []).map((entry, index) => (
              <div key={entry.id}>
                <Badge tone="rank">#{entry.seed ?? index + 1}</Badge>
                <span>{entry.profile?.display_name ?? "Player"}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="bracket-step bracket-preview-step">
          <div className="step-title">
            <span>3</span>
            <div>
              <p>Bracket</p>
              <h3>Match board</h3>
            </div>
          </div>
          <div className="simple-bracket-list">
            {tournamentMatches.length === 0 ? <p>Seed the tournament to create matches.</p> : null}
            {tournamentMatches.map((match) => (
              <div key={match.id} className="bracket-slot">
                <Badge tone={match.status === "ready" ? "win" : "neutral"}>R{match.round}</Badge>
                <span>{match.player_one_id ? "Player one" : "TBD"}</span>
                <strong>vs</strong>
                <span>{match.player_two_id ? "Player two" : "TBD"}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </RetroPanel>
  );
}

function PageTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="page-title">
      <p>{eyebrow}</p>
      <h1>{title}</h1>
    </div>
  );
}
