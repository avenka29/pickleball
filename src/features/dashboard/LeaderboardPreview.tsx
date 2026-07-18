import { Medal } from "lucide-react";
import { Badge } from "../../components/Badge";
import { RetroPanel } from "../../components/RetroPanel";
import { getTrackRating, getTrackRecord } from "./api";
import type { LeaderboardPlayer, RankingTrack } from "./types";

type LeaderboardPreviewProps = {
  players: LeaderboardPlayer[];
  isLoading: boolean;
  track: RankingTrack;
  onTrackChange: (track: RankingTrack) => void;
};

export function LeaderboardPreview({ players, isLoading, track, onTrackChange }: LeaderboardPreviewProps) {
  return (
    <RetroPanel className="p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-display text-2xl text-deep-green">
          <Medal size={24} />
          Leaderboard
        </h2>
        <Badge tone="rank">Top 8</Badge>
      </div>

      <div className="segmented-control mb-4">
        <button type="button" className={track === "singles" ? "is-active" : ""} onClick={() => onTrackChange("singles")}>
          Singles
        </button>
        <button type="button" className={track === "doubles" ? "is-active" : ""} onClick={() => onTrackChange("doubles")}>
          Doubles
        </button>
      </div>

      {isLoading ? <p className="font-bold text-ink">Loading rankings...</p> : null}
      {!isLoading && players.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-net-line bg-cream p-4 font-bold text-ink">
          No ranked players yet. Ratings appear after provisional matches are complete.
        </div>
      ) : null}

      <ol className="space-y-3">
        {players.map((player, index) => (
          <li key={player.id} className={`leaderboard-row ${index < 3 ? "is-podium" : ""}`}>
            <Badge tone={index < 3 ? "theme" : "rank"}>#{index + 1}</Badge>
            <div className="min-w-0 flex-1">
              <p className="truncate font-black text-deep-green">{player.display_name || "Unnamed player"}</p>
              <p className="text-xs font-bold text-ink">
                {getTrackRecord(player, track).wins}-{getTrackRecord(player, track).losses} {track} record
              </p>
            </div>
            <div className="font-display text-2xl text-deep-green">{getTrackRating(player, track)}</div>
          </li>
        ))}
      </ol>
    </RetroPanel>
  );
}
