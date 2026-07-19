import { Activity, TrendingDown, TrendingUp } from "lucide-react";
import type { ReactNode } from "react";
import { Badge } from "../../components/Badge";
import { CourtDiagram } from "../../components/CourtDiagram";
import { RetroPanel } from "../../components/RetroPanel";
import { useCountUp } from "../../lib/useCountUp";
import { getTrackRating, getTrackRecord } from "./api";
import type { TrackableProfile } from "./types";

type RatingCardProps = {
  profile: TrackableProfile | null;
};

export function RatingCard({ profile }: RatingCardProps) {
  const matchesPlayed = profile?.matches_played ?? 0;
  const singlesRating = getTrackRating(profile, "singles");
  const doublesRating = getTrackRating(profile, "doubles");
  const displaySinglesRating = useCountUp(singlesRating);
  const displayDoublesRating = useCountUp(doublesRating);
  const singlesRecord = getTrackRecord(profile, "singles");
  const doublesRecord = getTrackRecord(profile, "doubles");
  const isProvisional = !singlesRating || matchesPlayed < 3;
  const progress = Math.min(matchesPlayed, 3);
  const winRate = matchesPlayed > 0 ? Math.round(((profile?.wins ?? 0) / matchesPlayed) * 100) : 0;

  return (
    <RetroPanel strong spotlight className="relative overflow-hidden p-5">
      <CourtDiagram className="court-diagram-watermark" />
      <div className="relative flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-black uppercase text-court-green">Your rating</p>
          <h2 className="mt-1 font-display text-3xl text-deep-green">
            {profile?.display_name || profile?.email || "Club player"}
          </h2>
        </div>
        <Badge tone={isProvisional ? "provisional" : "rank"}>{isProvisional ? "Provisional" : "Ranked"}</Badge>
      </div>

      <div className="mt-5">
        {isProvisional ? (
          <div className="space-y-4">
            <div className="font-display text-4xl leading-none text-deep-green">Provisional</div>
            <div className="flex gap-2" aria-label={`${progress} of 3 provisional matches completed`}>
              {[0, 1, 2].map((item) => (
                <span
                  key={item}
                  className={`h-8 w-8 rounded-full border-3 border-deep-green ${
                    item < progress ? "bg-pickle-yellow" : "bg-warm-white"
                  }`}
                />
              ))}
            </div>
            <p className="font-bold text-ink">{3 - progress > 0 ? `${3 - progress} match${3 - progress === 1 ? "" : "es"} until your first rating.` : "Your rating unlocks after this refresh."}</p>
          </div>
        ) : (
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <p className="mb-1 text-xs font-black uppercase text-court-green">Singles</p>
              <div className="score-display px-5 py-3 text-6xl tabular-nums">{displaySinglesRating}</div>
            </div>
            <div>
              <p className="mb-1 text-xs font-black uppercase text-court-green">Doubles</p>
              <div className="score-display bg-court-green px-4 py-3 text-3xl tabular-nums">{displayDoublesRating ?? "Prov."}</div>
            </div>
            <Badge tone="win" className="mb-2 gap-1">
              <TrendingUp size={14} />
              Ready
            </Badge>
          </div>
        )}
      </div>

      <div className="mt-6 grid grid-cols-3 gap-3 border-t-2 border-net-line pt-4">
        <Stat label="Singles" value={`${singlesRecord.wins}-${singlesRecord.losses}`} icon={<TrendingUp size={17} />} />
        <Stat label="Doubles" value={`${doublesRecord.wins}-${doublesRecord.losses}`} icon={<TrendingDown size={17} />} />
        <Stat label="Win rate" value={`${winRate}%`} icon={<Activity size={17} />} />
      </div>
    </RetroPanel>
  );
}

function Stat({ label, value, icon }: { label: string; value: string | number; icon: ReactNode }) {
  return (
    <div className="rounded-lg border-2 border-net-line bg-cream p-3">
      <div className="flex items-center gap-1 text-court-green">{icon}</div>
      <div className="mt-2 font-mono text-2xl font-bold leading-none tabular-nums text-deep-green">{value}</div>
      <div className="mt-1 text-xs font-black uppercase text-ink">{label}</div>
    </div>
  );
}
