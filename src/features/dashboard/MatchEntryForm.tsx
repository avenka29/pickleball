import { Minus, Plus, Save } from "lucide-react";
import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { RetroButton } from "../../components/RetroButton";
import { useRecordMatch } from "./api";
import type { LeaderboardPlayer, MatchEntryMode, Theme, TournamentSummary } from "./types";

type MatchEntryFormProps = {
  players: LeaderboardPlayer[];
  activeTheme: Theme | null | undefined;
  tournaments: TournamentSummary[];
};

type Side = "a" | "b";

export function MatchEntryForm({ players, activeTheme, tournaments }: MatchEntryFormProps) {
  const [mode, setMode] = useState<MatchEntryMode>("singles");
  const [sideAPlayer, setSideAPlayer] = useState("");
  const [sideATeammate, setSideATeammate] = useState("");
  const [sideBPlayer, setSideBPlayer] = useState("");
  const [sideBTeammate, setSideBTeammate] = useState("");
  const [sideAPlayerSearch, setSideAPlayerSearch] = useState("");
  const [sideATeammateSearch, setSideATeammateSearch] = useState("");
  const [sideBPlayerSearch, setSideBPlayerSearch] = useState("");
  const [sideBTeammateSearch, setSideBTeammateSearch] = useState("");
  const [sideAScore, setSideAScore] = useState(11);
  const [sideBScore, setSideBScore] = useState(9);
  const [tournamentId, setTournamentId] = useState("");
  const [tournamentMatchId, setTournamentMatchId] = useState("");
  const [lastResult, setLastResult] = useState<string | null>(null);
  const recordMatch = useRecordMatch();

  const validationMessage = useMemo(() => {
    if (!sideAPlayer || !sideBPlayer) return "Choose both players.";
    const selectedPlayers = mode === "doubles" ? [sideAPlayer, sideATeammate, sideBPlayer, sideBTeammate] : [sideAPlayer, sideBPlayer];
    if (mode === "doubles" && (!sideATeammate || !sideBTeammate)) return "Choose both teammates.";
    if (new Set(selectedPlayers.filter(Boolean)).size !== selectedPlayers.filter(Boolean).length) return "Each slot needs a different player.";
    if (mode === "tournament" && !tournamentId) return "Choose the tournament.";
    if (sideAScore === sideBScore) return "Scores cannot be tied.";
    return null;
  }, [mode, sideAPlayer, sideATeammate, sideBPlayer, sideBTeammate, tournamentId, sideAScore, sideBScore]);

  const winnerSide: Side = sideAScore > sideBScore ? "a" : "b";
  const selectedWinner = winnerSide === "a" ? sideAPlayer : sideBPlayer;
  const selectedLoser = winnerSide === "a" ? sideBPlayer : sideAPlayer;
  const winnerScore = winnerSide === "a" ? sideAScore : sideBScore;
  const loserScore = winnerSide === "a" ? sideBScore : sideAScore;

  const submitMatch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLastResult(null);
    if (validationMessage) return;

    recordMatch.mutate(
      {
        mode,
        winnerId: selectedWinner,
        loserId: selectedLoser,
        winnerScore,
        loserScore,
        themeId: activeTheme?.id,
        winnerTeam: winnerSide === "a" ? [sideAPlayer, sideATeammate] : [sideBPlayer, sideBTeammate],
        loserTeam: winnerSide === "a" ? [sideBPlayer, sideBTeammate] : [sideAPlayer, sideATeammate],
        tournamentId: tournamentId || undefined,
        tournamentMatchId: tournamentMatchId || undefined,
      },
      {
        onSuccess: (result) => {
          const bonus = result.multiplier > 1 ? ` with ${result.multiplier}x theme bonus` : "";
          setLastResult(`${mode === "tournament" ? "Tournament match" : mode === "doubles" ? "Doubles match" : "Singles match"} recorded${bonus}.`);
        },
      },
    );
  };

  return (
    <div className="track-page-flow">
      <section className="track-title-panel">
        <div>
          <h2>Track a Match</h2>
          <p>Pick a mode, enter the score, and choose players.</p>
        </div>
        <label className="track-mode-select">
          <span>Match mode</span>
          <select className="form-input" value={mode} onChange={(event) => setMode(event.target.value as MatchEntryMode)}>
            <option value="singles">Singles</option>
            <option value="doubles">Doubles</option>
            <option value="tournament">Tournament</option>
          </select>
        </label>
      </section>

      <form className="match-form" onSubmit={submitMatch}>
        {mode === "tournament" ? (
          <section className="form-grid">
            <label>
              <span>Tournament</span>
              <select className="form-input" value={tournamentId} onChange={(event) => setTournamentId(event.target.value)}>
                <option value="">Select tournament</option>
                {tournaments.map((tournament) => (
                  <option key={tournament.id} value={tournament.id}>
                    {tournament.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Match ID</span>
              <input className="form-input" placeholder="Optional bracket match id" value={tournamentMatchId} onChange={(event) => setTournamentMatchId(event.target.value)} />
            </label>
          </section>
        ) : null}

        <section className="track-score-section">
          <div className="match-versus-grid">
            <MatchSideCard
              label="First score"
              side="a"
              playerId={sideAPlayer}
              teammateId={sideATeammate}
              playerSearch={sideAPlayerSearch}
              teammateSearch={sideATeammateSearch}
              score={sideAScore}
              players={players}
              mode={mode}
              onPlayerChange={setSideAPlayer}
              onTeammateChange={setSideATeammate}
              onPlayerSearchChange={setSideAPlayerSearch}
              onTeammateSearchChange={setSideATeammateSearch}
              onScoreChange={setSideAScore}
            />

            <div className="versus-token">VS</div>

            <MatchSideCard
              label="Second score"
              side="b"
              playerId={sideBPlayer}
              teammateId={sideBTeammate}
              playerSearch={sideBPlayerSearch}
              teammateSearch={sideBTeammateSearch}
              score={sideBScore}
              players={players}
              mode={mode}
              onPlayerChange={setSideBPlayer}
              onTeammateChange={setSideBTeammate}
              onPlayerSearchChange={setSideBPlayerSearch}
              onTeammateSearchChange={setSideBTeammateSearch}
              onScoreChange={setSideBScore}
            />
          </div>
        </section>

        {validationMessage ? <p className="form-alert is-warning">{validationMessage}</p> : null}
        {recordMatch.error ? <p className="form-alert is-danger">{recordMatch.error.message}</p> : null}
        {lastResult ? (
          <p className="form-alert is-success">
            {lastResult}
            <span className="impact-puff" aria-hidden="true" />
          </p>
        ) : null}

        <RetroButton className="w-full justify-center gap-2 md:w-auto" disabled={Boolean(validationMessage) || recordMatch.isPending}>
          <Save size={18} />
          {recordMatch.isPending ? "Recording..." : "Record Match"}
        </RetroButton>
      </form>
    </div>
  );
}

type MatchSideCardProps = {
  label: string;
  side: Side;
  playerId: string;
  teammateId: string;
  playerSearch: string;
  teammateSearch: string;
  score: number;
  players: LeaderboardPlayer[];
  mode: MatchEntryMode;
  onPlayerChange: (playerId: string) => void;
  onTeammateChange: (playerId: string) => void;
  onPlayerSearchChange: (value: string) => void;
  onTeammateSearchChange: (value: string) => void;
  onScoreChange: (score: number) => void;
};

function MatchSideCard({
  label,
  side,
  playerId,
  teammateId,
  playerSearch,
  teammateSearch,
  score,
  players,
  mode,
  onPlayerChange,
  onTeammateChange,
  onPlayerSearchChange,
  onTeammateSearchChange,
  onScoreChange,
}: MatchSideCardProps) {
  const optionsId = `player-search-${side}`;
  const teammateOptionsId = `teammate-search-${side}`;
  const selectedPlayerName = players.find((player) => player.id === playerId)?.display_name || "";
  const selectedTeammateName = players.find((player) => player.id === teammateId)?.display_name || "";
  const scoreValue = Number.isFinite(score) ? score : 0;

  const updatePlayerSearch = (value: string) => {
    onPlayerSearchChange(value);
    onPlayerChange(findPlayerId(players, value));
  };

  const updateTeammateSearch = (value: string) => {
    onTeammateSearchChange(value);
    onTeammateChange(findPlayerId(players, value));
  };

  return (
    <section className="match-side-card">
      <div className="match-score-control">
        <button type="button" aria-label={`Decrease ${label} score`} onClick={() => onScoreChange(Math.max(0, scoreValue - 1))}>
          <Minus size={18} />
        </button>
        <input aria-label={`${label} score`} inputMode="numeric" min={0} type="number" value={scoreValue} onChange={(event) => onScoreChange(Number(event.target.value))} />
        <button type="button" aria-label={`Increase ${label} score`} onClick={() => onScoreChange(scoreValue + 1)}>
          <Plus size={18} />
        </button>
      </div>

      <div className="match-player-fields">
        <label className="player-search-field">
          <input
            className="form-input"
            list={optionsId}
            aria-label={mode === "doubles" ? "Search first player" : "Search player"}
            placeholder="Search players"
            value={playerSearch || selectedPlayerName}
            onChange={(event) => updatePlayerSearch(event.target.value)}
            onFocus={() => onPlayerSearchChange(selectedPlayerName)}
          />
          <PlayerOptions id={optionsId} players={players} />
        </label>

        {mode === "doubles" ? (
          <label className="player-search-field">
            <input
              className="form-input"
              list={teammateOptionsId}
              aria-label="Search second player"
              placeholder="Search teammates"
              value={teammateSearch || selectedTeammateName}
              onChange={(event) => updateTeammateSearch(event.target.value)}
              onFocus={() => onTeammateSearchChange(selectedTeammateName)}
            />
            <PlayerOptions id={teammateOptionsId} players={players} />
          </label>
        ) : null}
      </div>
    </section>
  );
}

function PlayerOptions({ id, players }: { id: string; players: LeaderboardPlayer[] }) {
  return (
    <datalist id={id}>
      {players.map((player) => (
        <option key={player.id} value={player.display_name || "Unnamed player"} />
      ))}
    </datalist>
  );
}

function findPlayerId(players: LeaderboardPlayer[], value: string) {
  const normalizedValue = value.trim().toLowerCase();
  return players.find((player) => (player.display_name || "Unnamed player").trim().toLowerCase() === normalizedValue)?.id ?? "";
}
