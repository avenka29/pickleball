import { Save, Shield, UserPlus } from "lucide-react";
import { useState } from "react";
import type { FormEvent } from "react";
import { Badge } from "../../components/Badge";
import { RetroButton } from "../../components/RetroButton";
import { RetroPanel } from "../../components/RetroPanel";
import { useAddWhitelistedUser, useOverrideElo, useWhitelist } from "./api";
import type { LeaderboardPlayer, RankingTrack } from "./types";

type AdminControlsProps = {
  players: LeaderboardPlayer[];
};

export function AdminControls({ players }: AdminControlsProps) {
  const whitelist = useWhitelist();
  const addUser = useAddWhitelistedUser();
  const overrideElo = useOverrideElo();
  const [email, setEmail] = useState("");
  const [roleOnSignup, setRoleOnSignup] = useState<"player" | "admin">("player");
  const [note, setNote] = useState("");
  const [playerId, setPlayerId] = useState("");
  const [track, setTrack] = useState<RankingTrack>("singles");
  const [elo, setElo] = useState(1200);

  const submitUser = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    addUser.mutate({ email, roleOnSignup, note });
  };

  const submitElo = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!playerId) return;
    overrideElo.mutate({ profileId: playerId, track, elo });
  };

  return (
    <RetroPanel className="p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-display text-2xl text-deep-green">
          <Shield size={23} />
          Admin
        </h2>
        <Badge tone="theme">{whitelist.data?.length ?? 0} allowed</Badge>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <form className="space-y-3 rounded-lg border-2 border-net-line bg-cream p-3" onSubmit={submitUser}>
          <h3 className="font-display text-xl text-deep-green">User management</h3>
          <input className="form-input" type="email" placeholder="player@example.com" value={email} onChange={(event) => setEmail(event.target.value)} required />
          <select className="form-input" value={roleOnSignup} onChange={(event) => setRoleOnSignup(event.target.value as "player" | "admin")}>
            <option value="player">Player</option>
            <option value="admin">Admin</option>
          </select>
          <input className="form-input" placeholder="Note" value={note} onChange={(event) => setNote(event.target.value)} />
          <RetroButton className="w-full justify-center gap-2" disabled={addUser.isPending}>
            <UserPlus size={17} />
            {addUser.isPending ? "Adding..." : "Add User"}
          </RetroButton>
          {addUser.error ? <p className="text-sm font-black text-clay-red">{addUser.error.message}</p> : null}
        </form>

        <form className="space-y-3 rounded-lg border-2 border-net-line bg-cream p-3" onSubmit={submitElo}>
          <h3 className="font-display text-xl text-deep-green">Elo override</h3>
          <select className="form-input" value={playerId} onChange={(event) => setPlayerId(event.target.value)} required>
            <option value="">Select player</option>
            {players.map((player) => (
              <option key={player.id} value={player.id}>
                {player.display_name || "Unnamed player"}
              </option>
            ))}
          </select>
          <div className="segmented-control">
            <button type="button" className={track === "singles" ? "is-active" : ""} onClick={() => setTrack("singles")}>
              Singles
            </button>
            <button type="button" className={track === "doubles" ? "is-active" : ""} onClick={() => setTrack("doubles")}>
              Doubles
            </button>
          </div>
          <input className="form-input" min={0} type="number" value={elo} onChange={(event) => setElo(Number(event.target.value))} />
          <RetroButton className="w-full justify-center gap-2" disabled={overrideElo.isPending}>
            <Save size={17} />
            {overrideElo.isPending ? "Saving..." : "Save Elo"}
          </RetroButton>
          {overrideElo.error ? <p className="text-sm font-black text-clay-red">{overrideElo.error.message}</p> : null}
        </form>
      </div>
    </RetroPanel>
  );
}
