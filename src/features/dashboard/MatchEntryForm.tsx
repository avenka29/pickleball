import { Minus, Plus, Save, Users } from "lucide-react";
import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Badge } from "../../components/Badge";
import { RetroButton } from "../../components/RetroButton";
import { RetroPanel } from "../../components/RetroPanel";
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
  const [sideAScore, setSideAScore] = useState(11);
  const [sideBScore, setSideBScore] = useState(9);
  const [winnerSide, setWinnerSide] = useState<Side>("a");
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
    <RetroPanel strong className="court-scorecard p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-2xl text-deep-green">Record match</h2>
        <Badge tone={activeTheme ? "theme" : "neutral"}>{activeTheme?.name ?? "Standard Elo"}</Badge>
      </div>

      <form className="space-y-5" onSubmit={submitMatch}>
        <div>
          <p className="mb-2 flex items-center gap-2 text-sm font-black uppercase text-court-green">
            <Users size={16} />
            Match mode
          </p>
          <div className="segmented-control segmented-control-3">
            {(["singles", "doubles", "tournament"] as MatchEntryMode[]).map((item) => (
              <button key={item} type="button" className={mode === item ? "is-active" : ""} onClick={() => setMode(item)}>
                {item[0].toUpperCase() + item.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {mode === "tournament" ? (
          <div className="grid gap-3 md:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-black uppercase text-court-green">Tournament</span>
              <select className="form-input" value={tournamentId} onChange={(event) => setTournamentId(event.target.value)}>
                <option value="">Select tournament</option>
                {tournaments.map((tournament) => (
                  <option key={tournament.id} value={tournament.id}>
                    {tournament.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-black uppercase text-court-green">Match ID</span>
              <input
                className="form-input"
                placeholder="Optional bracket match id"
                value={tournamentMatchId}
                onChange={(event) => setTournamentMatchId(event.target.value)}
              />
            </label>
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-[1fr_auto_1fr] md:items-end">
          <PlayerScoreBlock
            label="Side A"
            playerId={sideAPlayer}
            teammateId={sideATeammate}
            score={sideAScore}
            players={players}
            mode={mode}
            onPlayerChange={setSideAPlayer}
            onTeammateChange={setSideATeammate}
            onScoreChange={setSideAScore}
          />

          <div className="vs-medallion mx-auto rounded-full border-3 border-deep-green bg-pickle-yellow px-5 py-3 font-display text-2xl text-deep-green">
            VS
          </div>

          <PlayerScoreBlock
            label="Side B"
            playerId={sideBPlayer}
            teammateId={sideBTeammate}
            score={sideBScore}
            players={players}
            mode={mode}
            onPlayerChange={setSideBPlayer}
            onTeammateChange={setSideBTeammate}
            onScoreChange={setSideBScore}
          />
        </div>

        <div>
          <p className="mb-2 text-sm font-black uppercase text-court-green">Winner</p>
          <div className="segmented-control">
            <button type="button" className={winnerSide === "a" ? "is-active" : ""} onClick={() => setWinnerSide("a")}>
              Side A
            </button>
            <button type="button" className={winnerSide === "b" ? "is-active" : ""} onClick={() => setWinnerSide("b")}>
              Side B
            </button>
          </div>
        </div>

        {validationMessage ? <p className="rounded-lg border-2 border-clay-red bg-warm-white p-3 text-sm font-black text-clay-red">{validationMessage}</p> : null}
        {recordMatch.error ? <p className="rounded-lg border-2 border-clay-red bg-warm-white p-3 text-sm font-black text-clay-red">{recordMatch.error.message}</p> : null}
        {lastResult ? <p className="rounded-lg border-2 border-grass-green bg-pickle-yellow p-3 text-sm font-black text-deep-green">{lastResult}</p> : null}

        <RetroButton className="w-full justify-center gap-2 md:w-auto" disabled={Boolean(validationMessage) || recordMatch.isPending}>
          <Save size={18} />
          {recordMatch.isPending ? "Recording..." : "Record Match"}
        </RetroButton>
      </form>
    </RetroPanel>
  );
}

type PlayerScoreBlockProps = {
  label: string;
  playerId: string;
  teammateId: string;
  score: number;
  players: LeaderboardPlayer[];
  mode: MatchEntryMode;
  onPlayerChange: (playerId: string) => void;
  onTeammateChange: (playerId: string) => void;
  onScoreChange: (score: number) => void;
};

function PlayerScoreBlock({
  label,
  playerId,
  teammateId,
  score,
  players,
  mode,
  onPlayerChange,
  onTeammateChange,
  onScoreChange,
}: PlayerScoreBlockProps) {
  return (
    <div className="side-score-panel space-y-3">
      <label className="block">
        <span className="mb-2 block text-sm font-black uppercase text-court-green">{mode === "doubles" ? `${label} player` : label}</span>
        <select className="form-input" value={playerId} onChange={(event) => onPlayerChange(event.target.value)}>
          <option value="">Select player</option>
          {players.map((player) => (
            <option key={player.id} value={player.id}>
              {player.display_name || "Unnamed player"}
            </option>
          ))}
        </select>
      </label>

      {mode === "doubles" ? (
        <label className="block">
          <span className="mb-2 block text-sm font-black uppercase text-court-green">Teammate</span>
          <select className="form-input" value={teammateId} onChange={(event) => onTeammateChange(event.target.value)}>
            <option value="">Select teammate</option>
            {players.map((player) => (
              <option key={player.id} value={player.id}>
                {player.display_name || "Unnamed player"}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <div className="score-stepper">
        <button type="button" aria-label={`Decrease ${label} score`} onClick={() => onScoreChange(Math.max(0, score - 1))}>
          <Minus size={18} />
        </button>
        <input
          aria-label={`${label} score`}
          inputMode="numeric"
          min={0}
          type="number"
          value={score}
          onChange={(event) => onScoreChange(Number(event.target.value))}
        />
        <button type="button" aria-label={`Increase ${label} score`} onClick={() => onScoreChange(score + 1)}>
          <Plus size={18} />
        </button>
      </div>
    </div>
  );
}
