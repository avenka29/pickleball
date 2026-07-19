import { ArrowRight, Medal } from "lucide-react";
import { Fragment, useEffect, useMemo, useState } from "react";
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
  compact?: boolean;
  title?: string;
};

export function LeaderboardPreview({
  players,
  isLoading,
  track,
  onTrackChange,
  onViewAll,
  onSelectPlayer,
  compact = false,
  title = "Leaderboard",
}: LeaderboardPreviewProps) {
  const isTopThree = compact && title === "Top 3";
  const pageSize = 5;
  const [page, setPage] = useState(1);
  const rankedPlayers = useMemo(
    () =>
      players
        .filter((player) => getTrackRating(player, track) != null)
        .sort((a, b) => Number(getTrackRating(b, track) ?? 0) - Number(getTrackRating(a, track) ?? 0)),
    [players, track],
  );
  const provisionalPlayers = useMemo(
    () =>
      players
        .filter((player) => getTrackRating(player, track) == null)
        .sort((a, b) => getTrackRecord(b, track).matches - getTrackRecord(a, track).matches),
    [players, track],
  );
  const orderedPlayers = useMemo(() => [...rankedPlayers, ...provisionalPlayers], [rankedPlayers, provisionalPlayers]);
  const pageCount = Math.max(1, Math.ceil(orderedPlayers.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pageStart = (currentPage - 1) * pageSize;
  const shownPlayers = useMemo(() => {
    if (compact) return rankedPlayers.slice(0, isTopThree ? 3 : 5);
    return orderedPlayers.slice(pageStart, pageStart + pageSize);
  }, [compact, isTopThree, orderedPlayers, pageStart, rankedPlayers]);
  const shouldShowDivider = !compact && (rankedPlayers.length === 0 || shownPlayers.some((player) => getTrackRating(player, track) == null));

  useEffect(() => {
    setPage(1);
  }, [track]);

  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  return (
    <RetroPanel className={`${compact ? "rankings-preview" : ""} ${isTopThree ? "top-three-panel" : ""} p-5`}>
      <div className={`mb-4 flex flex-wrap items-center justify-between gap-3 ${isTopThree ? "top-three-header" : ""}`}>
        <h2 className="flex items-center gap-2 font-display text-2xl text-deep-green">
          <Medal size={24} />
          {title}
        </h2>
        {compact ? <Badge tone="rank">{rankedPlayers.length} ranked</Badge> : null}
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
      {!isLoading && compact && players.length > 0 && shownPlayers.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-net-line bg-cream p-4 font-bold text-ink">No ranked players yet.</div>
      ) : null}

      {compact ? (
        <ol className={isTopThree ? "top-three-grid" : "space-y-3"}>
          {shownPlayers.map((player, index) => {
            const rank = index + 1;
            const rating = getTrackRating(player, track);

            return (
              <li key={player.id} className="top-three-item" style={{ animationDelay: `${index * 55}ms` }}>
                <button type="button" className="top-three-card w-full text-left" onClick={() => onSelectPlayer?.(player.id)}>
                  <span className="top-three-rank">{rank}</span>
                  <div className="top-three-player">
                    <p>{player.display_name || "Unnamed player"}</p>
                    <span>Rank {rank}</span>
                  </div>
                  <div className="top-three-score">
                    <span>{track} Elo</span>
                    <strong>{rating ?? "Prov."}</strong>
                  </div>
                </button>
              </li>
            );
          })}
        </ol>
      ) : (
        <div className="rankings-table-wrap">
          <table className="rankings-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Name</th>
                <th>Record</th>
                <th>Elo</th>
              </tr>
            </thead>
            <tbody>
              {rankedPlayers.length === 0 && currentPage === 1 ? (
                <tr className="rankings-empty-row">
                  <td colSpan={4}>No ranked players yet</td>
                </tr>
              ) : null}
              {shownPlayers.map((player, index) => {
                const rating = getTrackRating(player, track);
                const record = getTrackRecord(player, track);
                const rank = rankedPlayers.findIndex((rankedPlayer) => rankedPlayer.id === player.id) + 1;
                const isProvisional = rating == null;
                const shouldInsertDivider =
                  shouldShowDivider &&
                  isProvisional &&
                  (index === 0 || getTrackRating(shownPlayers[index - 1], track) != null);

                return (
                  <Fragment key={player.id}>
                    {shouldInsertDivider ? (
                      <tr key={`${player.id}-divider`} className="rankings-divider-row">
                        <td colSpan={4}>
                          <span>Unranked players</span>
                        </td>
                      </tr>
                    ) : null}
                    <tr className={`row-reveal ${isProvisional ? "is-provisional" : ""}`} style={{ animationDelay: `${index * 45}ms` }}>
                      <td>
                        {isProvisional ? <Badge tone="provisional">New</Badge> : <Badge tone={rank <= 3 ? "theme" : "rank"}>#{rank}</Badge>}
                      </td>
                      <td>
                        <button type="button" className="rankings-name-button" onClick={() => onSelectPlayer?.(player.id)}>
                          {player.display_name || "Unnamed player"}
                        </button>
                      </td>
                      <td className="rankings-record">
                        {record.wins}-{record.losses}
                        <span>{record.matches} matches</span>
                      </td>
                      <td className="rankings-elo">{rating ?? "—"}</td>
                    </tr>
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {!compact && orderedPlayers.length > pageSize ? (
        <div className="leaderboard-pagination">
          <RetroButton type="button" variant="secondary" disabled={currentPage === 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>
            Previous
          </RetroButton>
          <span>
            Page {currentPage} of {pageCount}
          </span>
          <RetroButton type="button" variant="secondary" disabled={currentPage === pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))}>
            Next
          </RetroButton>
        </div>
      ) : null}

      {onViewAll && !compact ? (
        <RetroButton type="button" variant="secondary" className="mt-4 w-full justify-center gap-2" onClick={onViewAll}>
          View full leaderboard
          <ArrowRight size={16} />
        </RetroButton>
      ) : null}
    </RetroPanel>
  );
}
