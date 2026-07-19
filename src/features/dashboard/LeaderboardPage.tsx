import { ChevronRight, Medal, Search, Trophy } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "../../components/Badge";
import { RetroPanel } from "../../components/RetroPanel";
import { getTrackRating, getTrackRecord } from "./api";
import type { LeaderboardPlayer, RankingTrack } from "./types";

type LeaderboardFilter = "ranked" | "provisional" | "all";

type LeaderboardPageProps = {
  players: LeaderboardPlayer[];
  isLoading: boolean;
  track: RankingTrack;
  onTrackChange: (track: RankingTrack) => void;
  onSelectPlayer?: (playerId: string) => void;
};

function initialsFor(name: string) {
  return name.trim().slice(0, 1).toUpperCase() || "P";
}

export function LeaderboardPage({ players, isLoading, track, onTrackChange, onSelectPlayer }: LeaderboardPageProps) {
  const [filter, setFilter] = useState<LeaderboardFilter>("ranked");
  const [query, setQuery] = useState("");

  const ranked = useMemo(
    () =>
      players
        .filter((player) => getTrackRating(player, track) != null)
        .sort((a, b) => Number(getTrackRating(b, track) ?? 0) - Number(getTrackRating(a, track) ?? 0)),
    [players, track],
  );

  const provisional = useMemo(
    () =>
      players
        .filter((player) => getTrackRating(player, track) == null)
        .sort((a, b) => getTrackRecord(b, track).matches - getTrackRecord(a, track).matches),
    [players, track],
  );

  const visiblePlayers = useMemo(() => {
    if (filter === "ranked") return ranked;
    if (filter === "provisional") return provisional;
    return [...ranked, ...provisional];
  }, [filter, ranked, provisional]);

  const searched = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return visiblePlayers;
    return visiblePlayers.filter((player) => (player.display_name ?? "").toLowerCase().includes(q));
  }, [visiblePlayers, query]);

  return (
    <RetroPanel strong spotlight className="p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-display text-3xl text-deep-green">
          <Medal size={26} />
          Leaderboard
        </h2>
        <Badge tone="rank">{ranked.length} ranked</Badge>
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="segmented-control">
          <button type="button" className={track === "singles" ? "is-active" : ""} onClick={() => onTrackChange("singles")}>
            Singles
          </button>
          <button type="button" className={track === "doubles" ? "is-active" : ""} onClick={() => onTrackChange("doubles")}>
            Doubles
          </button>
        </div>

        <label className="relative flex-1 sm:max-w-xs">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-court-green" />
          <input
            type="search"
            className="form-input pl-9"
            placeholder="Find a player..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="Search players"
          />
        </label>
      </div>

      <div className="segmented-control segmented-control-3 mb-4">
        {(["ranked", "provisional", "all"] as LeaderboardFilter[]).map((item) => (
          <button key={item} type="button" className={filter === item ? "is-active" : ""} onClick={() => setFilter(item)}>
            {item[0].toUpperCase() + item.slice(1)}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div>
          <span className="sr-only">Loading rankings...</span>
          <div className="space-y-3" aria-hidden="true">
            <div className="skeleton h-16" />
            <div className="skeleton h-16" />
            <div className="skeleton h-16" />
            <div className="skeleton h-16" />
          </div>
        </div>
      ) : null}

      {!isLoading && searched.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-net-line bg-cream p-5 text-center font-bold text-ink">
          <Trophy size={22} className="mx-auto mb-2 text-court-green" />
          {query
            ? `No players match "${query}".`
            : filter === "provisional"
              ? "No provisional players right now."
              : "No ranked players yet. Ratings appear after 3 matches."}
        </div>
      ) : null}

      <ol className="space-y-2.5">
        {searched.map((player, index) => {
          const rating = getTrackRating(player, track);
          const record = getTrackRecord(player, track);
          const isProvisional = rating == null;
          const matchesToGo = Math.max(0, 3 - record.matches);
          const podiumRank = filter !== "provisional" && !isProvisional ? index + 1 : null;

          return (
            <li key={player.id} className="row-reveal" style={{ animationDelay: `${Math.min(index, 12) * 35}ms` }}>
              <button
                type="button"
                className={`leaderboard-row group w-full text-left ${podiumRank && podiumRank <= 3 ? "is-podium" : ""}`}
                onClick={() => onSelectPlayer?.(player.id)}
              >
                <Badge tone={podiumRank && podiumRank <= 3 ? "theme" : isProvisional ? "provisional" : "rank"}>
                  {podiumRank ? `#${podiumRank}` : "New"}
                </Badge>
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border-2 border-deep-green bg-warm-white font-display text-sm text-deep-green">
                  {initialsFor(player.display_name || "P")}
                </span>
                <span className="min-w-0 flex-1">
                  <p className="truncate font-black text-deep-green">{player.display_name || "Unnamed player"}</p>
                  <p className="text-xs font-bold text-ink">
                    {isProvisional
                      ? `${matchesToGo} match${matchesToGo === 1 ? "" : "es"} until ranked`
                      : `${record.wins}-${record.losses} ${track} record`}
                  </p>
                </span>
                <span className="font-mono text-2xl font-bold tabular-nums text-deep-green">{rating ?? "—"}</span>
                <ChevronRight size={18} className="text-court-green transition-transform duration-150 group-hover:translate-x-0.5" />
              </button>
            </li>
          );
        })}
      </ol>
    </RetroPanel>
  );
}
