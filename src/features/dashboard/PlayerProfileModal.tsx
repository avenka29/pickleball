import { Clock, LineChart, Trophy, X } from "lucide-react";
import { useEffect } from "react";
import { Badge } from "../../components/Badge";
import { CourtDiagram } from "../../components/CourtDiagram";
import { TrendSvg } from "../../components/TrendSvg";
import { useCountUp } from "../../lib/useCountUp";
import { getTrackRating, getTrackRecord, matchModeLabel, usePlayerMatches, useRatingTrend } from "./api";
import type { LeaderboardPlayer, RankingTrack } from "./types";

type PlayerProfileModalProps = {
  player: LeaderboardPlayer | null;
  track: RankingTrack;
  onClose: () => void;
};

function initialsFor(name: string) {
  return name.trim().slice(0, 1).toUpperCase() || "P";
}

export function PlayerProfileModal({ player, track, onClose }: PlayerProfileModalProps) {
  const matches = usePlayerMatches(player?.id, 8);
  const singlesTrend = useRatingTrend(player?.id, "singles");
  const doublesTrend = useRatingTrend(player?.id, "doubles");
  const activeTrend = track === "doubles" ? doublesTrend : singlesTrend;
  const displayedRating = useCountUp(getTrackRating(player, track));

  useEffect(() => {
    if (!player) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [player, onClose]);

  if (!player) return null;

  const singlesRecord = getTrackRecord(player, "singles");
  const doublesRecord = getTrackRecord(player, "doubles");
  const activeRecord = getTrackRecord(player, track);
  const winRate = activeRecord.matches > 0 ? Math.round((activeRecord.wins / activeRecord.matches) * 100) : 0;
  const trendPoints = (activeTrend.data ?? []).map((point) => point.elo_after ?? point.rating ?? point.elo_before ?? 1200);

  return (
    <div className="profile-modal-backdrop" role="dialog" aria-modal="true" aria-label={`${player.display_name ?? "Player"} profile`} onClick={onClose}>
      <div className="profile-modal relative overflow-hidden p-5 sm:p-6" onClick={(event) => event.stopPropagation()}>
        <CourtDiagram className="court-diagram-watermark" />
        <button type="button" className="profile-modal-close" onClick={onClose} aria-label="Close player profile">
          <X size={18} />
        </button>

        <div className="relative flex flex-wrap items-center gap-4">
          <span className="grid h-16 w-16 shrink-0 place-items-center rounded-full border-3 border-deep-green bg-pickle-yellow font-display text-2xl text-deep-green">
            {initialsFor(player.display_name || "P")}
          </span>
          <div className="min-w-0">
            <p className="text-sm font-black uppercase text-court-green">Player profile</p>
            <h2 className="truncate font-display text-3xl leading-none text-deep-green">{player.display_name || "Unnamed player"}</h2>
          </div>
        </div>

        <div className="relative mt-5 flex flex-wrap items-end gap-3">
          <div>
            <p className="mb-1 text-xs font-black uppercase text-court-green">{track} rating</p>
            <div className="score-display px-5 py-3 text-5xl">{displayedRating ?? "Prov."}</div>
          </div>
          <Badge tone={activeRecord.matches >= 3 ? "rank" : "provisional"}>{activeRecord.matches >= 3 ? "Ranked" : "Provisional"}</Badge>
        </div>

        <div className="relative mt-5 grid grid-cols-3 gap-3">
          <MiniStat label="Singles" value={`${singlesRecord.wins}-${singlesRecord.losses}`} />
          <MiniStat label="Doubles" value={`${doublesRecord.wins}-${doublesRecord.losses}`} />
          <MiniStat label="Win rate" value={`${winRate}%`} />
        </div>

        <div className="relative mt-5 rounded-lg border-2 border-net-line bg-cream p-3">
          <p className="mb-2 flex items-center gap-2 text-sm font-black uppercase text-court-green">
            <LineChart size={16} />
            {track} trend
          </p>
          <TrendSvg points={trendPoints} />
        </div>

        <div className="relative mt-5">
          <p className="mb-2 flex items-center gap-2 text-sm font-black uppercase text-court-green">
            <Trophy size={16} />
            Recent matches
          </p>
          {matches.isLoading ? (
            <div className="space-y-2" aria-hidden="true">
              <div className="skeleton h-14" />
              <div className="skeleton h-14" />
            </div>
          ) : null}
          {!matches.isLoading && (matches.data ?? []).length === 0 ? (
            <p className="rounded-lg border-2 border-dashed border-net-line bg-cream p-3 font-bold text-ink">No matches recorded yet.</p>
          ) : null}
          <div className="space-y-2">
            {(matches.data ?? []).map((match) => {
              const won = match.winner?.id === player.id;
              return (
                <div key={match.id} className="match-card">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={won ? "win" : "loss"}>{won ? "Won" : "Lost"}</Badge>
                      <p className="font-bold text-ink">
                        vs {won ? match.loser?.display_name ?? "opponent" : match.winner?.display_name ?? "opponent"}
                      </p>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-sm font-bold text-ink">
                      <span className="font-mono tabular-nums">
                        {match.winner_score ?? "-"}-{match.loser_score ?? "-"}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Clock size={13} />
                        {new Date(match.played_at).toLocaleDateString()}
                      </span>
                      <Badge tone="rank">{matchModeLabel(match.match_type ?? match.mode)}</Badge>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border-2 border-net-line bg-cream p-3 text-center">
      <div className="font-mono text-xl font-bold leading-none tabular-nums text-deep-green">{value}</div>
      <div className="mt-1 text-xs font-black uppercase text-ink">{label}</div>
    </div>
  );
}
