import { Clock, Trophy } from "lucide-react";
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
  compact?: boolean;
};

export function RecentMatchesList({ matches, isLoading, selectedMatchId, onViewMatch, compact = false }: RecentMatchesListProps) {
  return (
    <RetroPanel className={`${compact ? "history-preview" : ""} p-5`}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="font-display text-2xl text-deep-green">{compact ? "Recent feed" : "Recent matches"}</h2>
        <Badge tone="neutral">{matches.length} shown</Badge>
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
        {matches.map((match) => (
          <article key={match.id} id={`match-${match.id}`} className={`match-card ${selectedMatchId === match.id ? "is-selected" : ""}`}>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Trophy size={17} className="text-grass-green" />
                <p className="font-black text-deep-green">{match.winner?.display_name ?? "Winner"}</p>
                <span className="font-bold text-ink">def.</span>
                <p className="font-bold text-ink">{match.loser?.display_name ?? "Loser"}</p>
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
            {compact ? null : (
              <RetroButton
                type="button"
                variant={selectedMatchId === match.id ? "highlight" : "secondary"}
                className="self-start px-3 py-2 text-sm"
                onClick={() => onViewMatch?.(match)}
              >
                Details
              </RetroButton>
            )}
            {compact ? (
              <button type="button" className="match-link" onClick={() => onViewMatch?.(match)}>
                View
              </button>
            ) : null}
          </article>
        ))}
      </div>
    </RetroPanel>
  );
}
