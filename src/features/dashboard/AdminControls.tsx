import { Save, Shield, UserPlus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Badge } from "../../components/Badge";
import { RetroButton } from "../../components/RetroButton";
import { RetroPanel } from "../../components/RetroPanel";
import { useAddWhitelistedUser, useOverrideElo, useThemes, useUpdateThemeConfig, useWhitelist } from "./api";
import type { LeaderboardPlayer, RankingTrack } from "./types";

type AdminControlsProps = {
  players: LeaderboardPlayer[];
};

export function AdminControls({ players }: AdminControlsProps) {
  const whitelist = useWhitelist();
  const themes = useThemes();
  const addUser = useAddWhitelistedUser();
  const overrideElo = useOverrideElo();
  const updateTheme = useUpdateThemeConfig();
  const firstTheme = themes.data?.[0];
  const [email, setEmail] = useState("");
  const [roleOnSignup, setRoleOnSignup] = useState<"player" | "admin">("player");
  const [note, setNote] = useState("");
  const [playerId, setPlayerId] = useState("");
  const [track, setTrack] = useState<RankingTrack>("singles");
  const [elo, setElo] = useState(1200);
  const [themeId, setThemeId] = useState("");
  const selectedTheme = useMemo(() => themes.data?.find((theme) => theme.id === themeId) ?? firstTheme, [firstTheme, themeId, themes.data]);
  const [themeName, setThemeName] = useState("");
  const [themeDescription, setThemeDescription] = useState("");
  const [themeConfig, setThemeConfig] = useState("{}");
  const [themeActive, setThemeActive] = useState(true);

  useEffect(() => {
    if (!firstTheme || themeId) return;
    setThemeName(firstTheme.name);
    setThemeDescription(firstTheme.description ?? "");
    setThemeConfig(JSON.stringify(firstTheme.rule_config ?? {}, null, 2));
    setThemeActive(firstTheme.is_active);
  }, [firstTheme, themeId]);

  const submitUser = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    addUser.mutate({ email, roleOnSignup, note });
  };

  const submitElo = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!playerId) return;
    overrideElo.mutate({ profileId: playerId, track, elo });
  };

  const submitTheme = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedTheme) return;
    updateTheme.mutate({
      themeId: selectedTheme.id,
      slug: selectedTheme.slug,
      name: themeName || selectedTheme.name,
      description: themeDescription || selectedTheme.description || "",
      startsAt: selectedTheme.starts_at,
      endsAt: selectedTheme.ends_at,
      ruleConfig: themeConfig || JSON.stringify(selectedTheme.rule_config ?? {}),
      isActive: themeActive,
    });
  };

  const loadTheme = (nextThemeId: string) => {
    const nextTheme = themes.data?.find((theme) => theme.id === nextThemeId);
    setThemeId(nextThemeId);
    setThemeName(nextTheme?.name ?? "");
    setThemeDescription(nextTheme?.description ?? "");
    setThemeConfig(JSON.stringify(nextTheme?.rule_config ?? {}, null, 2));
    setThemeActive(nextTheme?.is_active ?? true);
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

      <div className="grid gap-4 xl:grid-cols-3">
        <form className="admin-cartridge" onSubmit={submitUser}>
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

        <form className="admin-cartridge" onSubmit={submitElo}>
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

        <form className="admin-cartridge" onSubmit={submitTheme}>
          <h3 className="font-display text-xl text-deep-green">Theme config</h3>
          <select className="form-input" value={themeId || selectedTheme?.id || ""} onChange={(event) => loadTheme(event.target.value)} disabled={!themes.data?.length}>
            {(themes.data ?? []).map((theme) => (
              <option key={theme.id} value={theme.id}>
                {theme.name}
              </option>
            ))}
          </select>
          <input className="form-input" placeholder={selectedTheme?.name ?? "Theme name"} value={themeName} onChange={(event) => setThemeName(event.target.value)} />
          <textarea
            className="form-input min-h-20 resize-y"
            placeholder={selectedTheme?.description ?? "Description"}
            value={themeDescription}
            onChange={(event) => setThemeDescription(event.target.value)}
          />
          <textarea className="form-input min-h-24 resize-y font-mono text-sm" value={themeConfig} onChange={(event) => setThemeConfig(event.target.value)} />
          <label className="flex min-h-11 items-center gap-3 rounded-lg border-2 border-net-line bg-warm-white px-3 font-black text-deep-green">
            <input type="checkbox" checked={themeActive} onChange={(event) => setThemeActive(event.target.checked)} />
            Active
          </label>
          <RetroButton className="w-full justify-center gap-2" disabled={updateTheme.isPending || !selectedTheme}>
            <Save size={17} />
            {updateTheme.isPending ? "Updating..." : "Update Theme"}
          </RetroButton>
          {updateTheme.error ? <p className="text-sm font-black text-clay-red">{updateTheme.error.message}</p> : null}
        </form>
      </div>
    </RetroPanel>
  );
}
