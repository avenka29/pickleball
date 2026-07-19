import { Activity, TrendingDown, TrendingUp } from "lucide-react";
import type { ReactNode } from "react";
import { Badge } from "../../components/Badge";
import { RetroPanel } from "../../components/RetroPanel";
import { getTrackRating, getTrackRecord } from "./api";
import type { TrackableProfile } from "./types";

type RatingCardProps = {
  profile: TrackableProfile | null;
};

export function RatingCard({ profile }: RatingCardProps) {
  const singlesRating = getTrackRating(profile, "singles");
  const doublesRating = getTrackRating(profile, "doubles");
  const singlesRecord = getTrackRecord(profile, "singles");
  const doublesRecord = getTrackRecord(profile, "doubles");
  const isProvisional = !singlesRating || singlesRecord.matches < 3;
  const progress = Math.min(singlesRecord.matches, 3);
  const totalMatches = (profile?.matches_played ?? singlesRecord.matches + doublesRecord.matches) || 0;
  const winRate = totalMatches > 0 ? Math.round(((profile?.wins ?? singlesRecord.wins + doublesRecord.wins) / totalMatches) * 100) : 0;

  return (
    <RetroPanel strong className="player-card rating-summary-card p-5">
      <div className="rating-card-header">
        <div>
          <p>Your rating</p>
          <h2>{profile?.display_name || profile?.email || "Club player"}</h2>
        </div>
        <Badge tone={isProvisional ? "provisional" : "rank"}>{isProvisional ? "Provisional" : "Ranked"}</Badge>
      </div>

      {isProvisional ? (
        <div className="rating-provisional">
          <strong>Provisional</strong>
          <div className="provisional-dots" aria-label={`${progress} of 3 provisional matches completed`}>
            {[0, 1, 2].map((item) => (
              <span key={item} className={item < progress ? "is-filled" : ""} />
            ))}
          </div>
          <p>{3 - progress > 0 ? `${3 - progress} match${3 - progress === 1 ? "" : "es"} until your first rating.` : "Your rating unlocks after this refresh."}</p>
        </div>
      ) : (
        <div className="rating-tile-grid">
          <RatingTile label="Singles" value={singlesRating ?? "Prov."} record={`${singlesRecord.wins}-${singlesRecord.losses}`} />
          <RatingTile label="Doubles" value={doublesRating ?? "Prov."} record={`${doublesRecord.wins}-${doublesRecord.losses}`} />
        </div>
      )}

      <div className="rating-mini-grid">
        <Stat label="Singles" value={`${singlesRecord.wins}-${singlesRecord.losses}`} icon={<TrendingUp size={16} />} />
        <Stat label="Doubles" value={`${doublesRecord.wins}-${doublesRecord.losses}`} icon={<TrendingDown size={16} />} />
        <Stat label="Win rate" value={`${winRate}%`} icon={<Activity size={16} />} />
      </div>
    </RetroPanel>
  );
}

function RatingTile({ label, value, record }: { label: string; value: string | number; record: string }) {
  return (
    <div className="rating-tile">
      <span>{label}</span>
      <strong title={String(value)}>{value}</strong>
      <small>{record} record</small>
    </div>
  );
}

function Stat({ label, value, icon }: { label: string; value: string | number; icon: ReactNode }) {
  return (
    <div className="rating-stat">
      <div>{icon}</div>
      <strong title={String(value)}>{value}</strong>
      <span>{label}</span>
    </div>
  );
}
