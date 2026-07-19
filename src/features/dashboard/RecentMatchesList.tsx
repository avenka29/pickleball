import { Clock, Trash2, Trophy } from "lucide-react";
import { Badge } from "../../components/Badge";
import { RetroButton } from "../../components/RetroButton";
import { RetroPanel } from "../../components/RetroPanel";
import { matchModeLabel } from "./api";
import type { RecentMatch } from "./types";

type RecentMatchesListProps = {
  matches: RecentMatch[];
  isLoading: boolean;
  selectedMatchId?: string | null;
  onViewMatch?: (match: RecentMatch) => void;
  onSelectPlayer?: (playerId: string) => void;
  onDeleteMatch?: (match: RecentMatch) => void;
  deletingMatchId?: string | null;
  compact?: boolean;
};

export function RecentMatchesList({
  matches,
  isLoading,
  selectedMatchId,
  onViewMatch,
  onSelectPlayer,
  onDeleteMatch,
  deletingMatchId,
  compact = false,
}: RecentMatchesListProps) {
  const shownMatches = compact ? matches.slice(0, 5) : matches;

  return (
    <RetroPanel className={`${compact ? "history-preview" : ""} p-5`}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="font-display text-2xl text-deep-green">{compact ? "Recent feed" : "Recent matches"}</h2>
        <Badge tone="neutral">{shownMatches.length} shown</Badge>
      </div>

      {isLoading ? (
        <div>
          <span className="sr-only">Loading match feed...</span>
          <div className="space-y-3" aria-hidden="true">
            <div className="skeleton h-20" />
            <div className="skeleton h-20" />
            <div className="skeleton h-20" />
          </div>
        </div>
      ) : null}
      {!isLoading && matches.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-net-line bg-cream p-4 font-bold text-ink">
          No matches recorded yet. The next scorecard starts the feed.
        </div>
      ) : null}

      <div className="space-y-3">
        {shownMatches.map((match, index) => (
          <article
            key={match.id}
            id={`match-${match.id}`}
            className={`match-card row-reveal ${selectedMatchId === match.id ? "is-selected" : ""}`}
            style={{ animationDelay: `${Math.min(index, 10) * 30}ms` }}
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Trophy size={17} className="text-grass-green" />
                {match.winner?.id && onSelectPlayer ? (
                  <button type="button" className="player-link" onClick={() => onSelectPlayer(match.winner!.id)}>
                    {match.winner?.display_name ?? "Winner"}
                  </button>
                ) : (
                  <p className="font-black text-deep-green">{match.winner?.display_name ?? "Winner"}</p>
                )}
                <span className="font-bold text-ink">def.</span>
                {match.loser?.id && onSelectPlayer ? (
                  <button type="button" className="player-link" onClick={() => onSelectPlayer(match.loser!.id)}>
                    {match.loser?.display_name ?? "Loser"}
                  </button>
                ) : (
                  <p className="font-bold text-ink">{match.loser?.display_name ?? "Loser"}</p>
                )}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm font-bold text-ink">
                <span>
                  {match.winner_score ?? "-"}-{match.loser_score ?? "-"}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Clock size={14} />
                  {new Date(match.played_at).toLocaleDateString()}
                </span>
                {match.multiplier && Number(match.multiplier) > 1 ? <Badge tone="theme">{Number(match.multiplier)}x</Badge> : null}
                {match.theme ? <Badge tone="theme">{match.theme.name}</Badge> : null}
                <Badge tone="rank">{matchModeLabel(match.match_type ?? match.mode)}</Badge>
              </div>
              {selectedMatchId === match.id ? (
                <dl className="mt-3 grid gap-2 rounded-lg border-2 border-net-line bg-warm-white p-3 text-sm font-bold text-ink sm:grid-cols-2">
                  <div>
                    <dt className="text-xs font-black uppercase text-court-green">Match ID</dt>
                    <dd className="break-all">{match.id}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-black uppercase text-court-green">Recorded</dt>
                    <dd>{new Date(match.created_at).toLocaleString()}</dd>
                  </div>
                </dl>
              ) : null}
            </div>
            <div className="match-card-actions">
              {compact ? (
                <button type="button" className="match-link" onClick={() => onViewMatch?.(match)}>
                  View
                </button>
              ) : (
                <RetroButton
                  type="button"
                  variant={selectedMatchId === match.id ? "highlight" : "secondary"}
                  className="px-3 py-2 text-sm"
                  onClick={() => onViewMatch?.(match)}
                >
                  Details
                </RetroButton>
              )}
              {onDeleteMatch ? (
                <button
                  type="button"
                  className="match-delete-button"
                  disabled={deletingMatchId === match.id}
                  onClick={() => onDeleteMatch(match)}
                  aria-label={`Delete match ${match.winner?.display_name ?? "winner"} versus ${match.loser?.display_name ?? "loser"}`}
                >
                  <Trash2 size={16} />
                  <span>{deletingMatchId === match.id ? "Deleting" : "Delete"}</span>
                </button>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </RetroPanel>
  );
}
