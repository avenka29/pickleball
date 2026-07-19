import { ArrowRight, Medal } from "lucide-react";
import { Badge } from "../../components/Badge";
import { RetroButton } from "../../components/RetroButton";
import { RetroPanel } from "../../components/RetroPanel";
import { getTrackRating, getTrackRecord } from "./api";
import type { LeaderboardPlayer, RankingTrack } from "./types";

type LeaderboardPreviewProps = {
  players: LeaderboardPlayer[];
  isLoading: boolean;
  track: RankingTrack;
  onTrackChange: (track: RankingTrack) => void;
  onViewAll?: () => void;
  onSelectPlayer?: (playerId: string) => void;
};

export function LeaderboardPreview({ players, isLoading, track, onTrackChange, onViewAll, onSelectPlayer }: LeaderboardPreviewProps) {
  return (
    <RetroPanel className="p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-display text-2xl text-deep-green">
          <Medal size={24} />
          Leaderboard
        </h2>
        <Badge tone="rank">Top {players.length || 5}</Badge>
      </div>

      <div className="segmented-control mb-4">
        <button type="button" className={track === "singles" ? "is-active" : ""} onClick={() => onTrackChange("singles")}>
          Singles
        </button>
        <button type="button" className={track === "doubles" ? "is-active" : ""} onClick={() => onTrackChange("doubles")}>
          Doubles
        </button>
      </div>

      {isLoading ? (
        <div>
          <span className="sr-only">Loading rankings...</span>
          <div className="space-y-3" aria-hidden="true">
            <div className="skeleton h-14" />
            <div className="skeleton h-14" />
            <div className="skeleton h-14" />
          </div>
        </div>
      ) : null}
      {!isLoading && players.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-net-line bg-cream p-4 font-bold text-ink">
          No ranked players yet. Ratings appear after provisional matches are complete.
        </div>
      ) : null}

      <ol className="space-y-3">
        {players.map((player, index) => (
          <li key={player.id} className="row-reveal" style={{ animationDelay: `${index * 45}ms` }}>
            <button
              type="button"
              className={`leaderboard-row w-full text-left ${index < 3 ? "is-podium" : ""}`}
              onClick={() => onSelectPlayer?.(player.id)}
            >
              <Badge tone={index < 3 ? "theme" : "rank"}>#{index + 1}</Badge>
              <div className="min-w-0 flex-1">
                <p className="truncate font-black text-deep-green">{player.display_name || "Unnamed player"}</p>
                <p className="text-xs font-bold text-ink">
                  {getTrackRecord(player, track).wins}-{getTrackRecord(player, track).losses} {track} record
                </p>
              </div>
              <div className="font-mono text-2xl font-bold tabular-nums text-deep-green">{getTrackRating(player, track)}</div>
            </button>
          </li>
        ))}
      </ol>

      {onViewAll ? (
        <RetroButton type="button" variant="secondary" className="mt-4 w-full justify-center gap-2" onClick={onViewAll}>
          View full leaderboard
          <ArrowRight size={16} />
        </RetroButton>
      ) : null}
    </RetroPanel>
  );
}
