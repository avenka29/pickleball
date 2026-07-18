import { Activity, LineChart, TrendingDown, TrendingUp } from "lucide-react";
import type { ReactNode } from "react";
import { Badge } from "../../components/Badge";
import { RetroPanel } from "../../components/RetroPanel";
import { getTrackRating, getTrackRecord, useRatingTrend } from "./api";
import type { RankingTrack, TrackableProfile } from "./types";

type ProfileAnalyticsProps = {
  profile: TrackableProfile | null;
  track: RankingTrack;
};

export function ProfileAnalytics({ profile, track }: ProfileAnalyticsProps) {
  const trend = useRatingTrend(profile?.id, track);
  const singles = getTrackRecord(profile, "singles");
  const doubles = getTrackRecord(profile, "doubles");
  const activeRecord = getTrackRecord(profile, track);
  const recent = trend.data ?? [];
  const recentWins = recent.slice(-6).filter((point) => point.result === "win").length;
  const recentLosses = recent.slice(-6).filter((point) => point.result === "loss").length;
  const latestDelta = recent.length > 0 ? recent[recent.length - 1]?.elo_delta ?? null : null;

  return (
    <RetroPanel className="p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-display text-2xl text-deep-green">
          <Activity size={23} />
          Profile
        </h2>
        <Badge tone={latestDelta == null ? "neutral" : latestDelta >= 0 ? "win" : "loss"}>
          {latestDelta == null ? "No delta" : latestDelta > 0 ? `+${latestDelta}` : latestDelta}
        </Badge>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <RatingStat label="Singles Elo" value={getTrackRating(profile, "singles") ?? "Provisional"} record={`${singles.wins}-${singles.losses}`} />
        <RatingStat label="Doubles Elo" value={getTrackRating(profile, "doubles") ?? "Provisional"} record={`${doubles.wins}-${doubles.losses}`} />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_160px] sm:items-stretch">
        <div className="rounded-lg border-2 border-net-line bg-cream p-3">
          <div className="mb-2 flex items-center justify-between gap-3">
            <p className="flex items-center gap-2 text-sm font-black uppercase text-court-green">
              <LineChart size={16} />
              {track} trend
            </p>
            <span className="text-xs font-black uppercase text-ink">Recent {recentWins}-{recentLosses}</span>
          </div>
          <TrendSvg points={recent.map((point, index) => point.elo_after ?? point.rating ?? point.elo_before ?? 1200 + index)} />
        </div>

        <div className="rounded-lg border-2 border-net-line bg-warm-white p-3">
          <p className="text-sm font-black uppercase text-court-green">Recent form</p>
          <div className="mt-3 flex gap-2">
            {recent.slice(-6).map((point, index) => (
              <Badge key={point.id || index} tone={point.result === "loss" ? "loss" : "win"}>
                {point.result === "loss" ? "L" : "W"}
              </Badge>
            ))}
            {recent.length === 0 ? <span className="font-bold text-ink">No rated matches yet.</span> : null}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <MiniStat label="Wins" value={activeRecord.wins} icon={<TrendingUp size={15} />} />
            <MiniStat label="Losses" value={activeRecord.losses} icon={<TrendingDown size={15} />} />
          </div>
        </div>
      </div>
    </RetroPanel>
  );
}

function RatingStat({ label, value, record }: { label: string; value: string | number; record: string }) {
  return (
    <div className="rounded-lg border-2 border-net-line bg-cream p-3">
      <p className="text-xs font-black uppercase text-court-green">{label}</p>
      <div className="mt-1 font-display text-3xl leading-none text-deep-green">{value}</div>
      <p className="mt-1 text-sm font-bold text-ink">{record} record</p>
    </div>
  );
}

function MiniStat({ label, value, icon }: { label: string; value: number; icon: ReactNode }) {
  return (
    <div className="rounded-lg border-2 border-net-line bg-cream p-2">
      <div className="text-court-green">{icon}</div>
      <div className="font-display text-xl leading-none text-deep-green">{value}</div>
      <div className="text-xs font-black uppercase text-ink">{label}</div>
    </div>
  );
}

function TrendSvg({ points }: { points: number[] }) {
  if (points.length < 2) {
    return <div className="grid h-28 place-items-center rounded-lg border-2 border-dashed border-net-line bg-warm-white font-bold text-ink">Trend starts after two rated matches.</div>;
  }

  const width = 320;
  const height = 112;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const spread = Math.max(1, max - min);
  const path = points
    .map((point, index) => {
      const x = (index / Math.max(1, points.length - 1)) * width;
      const y = height - ((point - min) / spread) * (height - 18) - 9;
      return `${index === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg className="h-28 w-full rounded-lg border-2 border-net-line bg-warm-white" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Rating trend">
      <path d="M0 84 H320 M0 56 H320 M0 28 H320" stroke="#D8C59B" strokeWidth="2" />
      <path d={path} fill="none" stroke="#006400" strokeLinecap="round" strokeLinejoin="round" strokeWidth="5" />
      {points.map((point, index) => {
        const x = (index / Math.max(1, points.length - 1)) * width;
        const y = height - ((point - min) / spread) * (height - 18) - 9;
        return <circle key={`${point}-${index}`} cx={x} cy={y} r="4" fill="#E8C84A" stroke="#063B22" strokeWidth="2" />;
      })}
    </svg>
  );
}
