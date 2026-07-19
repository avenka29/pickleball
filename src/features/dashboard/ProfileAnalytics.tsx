import { Activity, LineChart } from "lucide-react";
import { RetroPanel } from "../../components/RetroPanel";
import { getTrackRating, getTrackRecord, useRatingTrend } from "./api";
import type { RankingTrack, TrackableProfile } from "./types";

type ProfileAnalyticsProps = {
  profile: TrackableProfile | null;
  track: RankingTrack;
  simple?: boolean;
};

export function ProfileAnalytics({ profile, track, simple = false }: ProfileAnalyticsProps) {
  const trend = useRatingTrend(profile?.id, track);
  const activeRecord = getTrackRecord(profile, track);
  const recent = trend.data ?? [];
  const winRate = activeRecord.matches > 0 ? Math.round((activeRecord.wins / activeRecord.matches) * 100) : 0;

  return (
    <RetroPanel className={`analytics-cabinet ${simple ? "analytics-simple" : ""} p-5`}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-display text-2xl text-deep-green">
          <Activity size={23} />
          {simple ? profile?.display_name || profile?.email || "Your stats" : "Profile"}
        </h2>
      </div>

      <div className="profile-stat-grid">
        <RatingStat label={`${track} Elo`} value={getTrackRating(profile, track) ?? "Provisional"} />
        <RatingStat label="Record" value={`${activeRecord.wins}-${activeRecord.losses}`} />
        <RatingStat label="Win rate" value={`${winRate}%`} />
      </div>

      <div className="mt-4">
        <div className="chart-screen rounded-lg border-3 border-deep-green bg-cream p-3">
          <div className="mb-2 flex items-center justify-between gap-3">
            <p className="flex items-center gap-2 text-sm font-black uppercase text-court-green">
              <LineChart size={16} />
              Elo trend
            </p>
          </div>
          <TrendSvg points={recent.map((point) => point.elo_after ?? point.rating ?? point.elo_before ?? null)} currentRating={getTrackRating(profile, track)} />
        </div>
      </div>
    </RetroPanel>
  );
}

function RatingStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="stat-cartridge">
      <p className="text-xs font-black uppercase text-court-green">{label}</p>
      <div className="mt-1 font-display text-3xl leading-none text-deep-green">{value}</div>
    </div>
  );
}

function TrendSvg({ points, currentRating }: { points: Array<number | null>; currentRating: number | null }) {
  const values = points.filter((point): point is number => typeof point === "number" && Number.isFinite(point));

  if (values.length < 2) {
    return (
      <div className="trend-empty">
        <strong>{currentRating ?? "Provisional"}</strong>
        <span>{values.length === 1 ? "One rated point recorded. Trend starts after the next rated match." : "Trend starts after two rated matches."}</span>
      </div>
    );
  }

  const width = 520;
  const height = 230;
  const padding = { top: 28, right: 34, bottom: 42, left: 58 };
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const buffer = Math.max(20, Math.ceil((rawMax - rawMin) * 0.18));
  const min = Math.floor((rawMin - buffer) / 10) * 10;
  const max = Math.ceil((rawMax + buffer) / 10) * 10;
  const spread = Math.max(1, max - min);
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const yTicks = [max, Math.round((max + min) / 2), min];
  const coordinates = values.map((point, index) => {
    const x = padding.left + (index / Math.max(1, values.length - 1)) * plotWidth;
    const y = padding.top + (1 - (point - min) / spread) * plotHeight;
    return { point, x, y };
  });
  const path = coordinates
    .map((point, index) => {
      return `${index === 0 ? "M" : "L"}${point.x.toFixed(1)},${point.y.toFixed(1)}`;
    })
    .join(" ");
  const first = values[0];
  const last = values[values.length - 1];

  return (
    <div className="trend-chart">
      <svg className="trend-svg" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Elo trend from ${first} to ${last}`}>
        <rect x="0" y="0" width={width} height={height} rx="14" fill="#F6E8C8" />
        {yTicks.map((tick) => {
          const y = padding.top + (1 - (tick - min) / spread) * plotHeight;
          return (
            <g key={tick}>
              <line x1={padding.left} x2={width - padding.right} y1={y} y2={y} stroke="#D7C8A9" strokeWidth="2" />
              <text x={padding.left - 10} y={y + 5} textAnchor="end" className="trend-axis-label">
                {tick}
              </text>
            </g>
          );
        })}
        <line x1={padding.left} x2={padding.left} y1={padding.top} y2={height - padding.bottom} stroke="#1C2826" strokeWidth="3" />
        <line x1={padding.left} x2={width - padding.right} y1={height - padding.bottom} y2={height - padding.bottom} stroke="#1C2826" strokeWidth="3" />
        <path d={path} fill="none" stroke="#2E6F40" strokeLinecap="round" strokeLinejoin="round" strokeWidth="6" />
        {coordinates.map(({ point, x, y }, index) => {
          const isLast = index === coordinates.length - 1;
          return (
            <g key={`${point}-${index}`}>
              <circle cx={x} cy={y} r={isLast ? 7 : 5} fill="#F4D068" stroke="#1C2826" strokeWidth="3" />
              {(isLast || values.length <= 6) ? (
                <text x={x} y={Math.max(16, y - 12)} textAnchor="middle" className="trend-point-label">
                  {point}
                </text>
              ) : null}
            </g>
          );
        })}
        <text x={padding.left} y={height - 12} textAnchor="middle" className="trend-axis-label">
          First
        </text>
        <text x={width - padding.right} y={height - 12} textAnchor="middle" className="trend-axis-label">
          Latest
        </text>
      </svg>
    </div>
  );
}
