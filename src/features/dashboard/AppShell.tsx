import { History, Home, LogOut, Medal, Shield, Swords, Trophy } from "lucide-react";
import { useMemo } from "react";
import type { ReactNode } from "react";
import { CourtDiagram } from "../../components/CourtDiagram";
import { RetroButton } from "../../components/RetroButton";
import { useSignOut } from "../auth/api";
import type { Profile } from "./types";

type AppShellProps = {
  profile: Profile | null;
  children: ReactNode;
  activePage: string;
  onPageChange: (page: string) => void;
};

const playerNav = [
  { label: "Clubhouse", icon: Home, pageId: "home" },
  { label: "Score It", icon: Swords, pageId: "record" },
  { label: "Ladder", icon: Medal, pageId: "rankings" },
  { label: "Replay", icon: History, pageId: "history" },
  { label: "Bracket", icon: Trophy, pageId: "tournaments" },
];

function PaddleMark({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <rect x="13" y="19" width="6" height="10" rx="2.5" fill="currentColor" />
      <ellipse cx="16" cy="12" rx="11" ry="12" fill="currentColor" />
      <circle cx="16" cy="8" r="1.3" fill="var(--color-cream)" />
      <circle cx="11" cy="12" r="1.3" fill="var(--color-cream)" />
      <circle cx="21" cy="12" r="1.3" fill="var(--color-cream)" />
      <circle cx="16" cy="16" r="1.3" fill="var(--color-cream)" />
      <circle className="club-mark-ball" cx="26" cy="24" r="4.5" fill="var(--color-pickle-yellow)" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export function AppShell({ profile, children, activePage, onPageChange }: AppShellProps) {
  const signOut = useSignOut();
  const navItems = useMemo(
    () => (profile?.role === "admin" ? [...playerNav, { label: "Admin", icon: Shield, pageId: "admin" }] : playerNav),
    [profile?.role],
  );

  return (
    <div className="app-arcade min-h-screen bg-cream text-ink lg:grid lg:grid-cols-[288px_1fr]">
      <aside className="club-sidebar hidden min-h-screen overflow-hidden p-5 text-warm-white lg:sticky lg:top-0 lg:block">
        <CourtDiagram className="court-diagram-sidebar" />

        <div className="relative mb-8 flex items-center gap-3">
          <div className="club-mark grid h-14 w-14 place-items-center rounded-full border-3 border-pickle-yellow bg-deep-green text-pickle-yellow">
            <PaddleMark size={28} />
          </div>
          <div>
            <div className="club-logo-title text-3xl leading-none">Pickle</div>
            <div className="club-logo-title text-3xl leading-none">Club</div>
            <div className="mt-1 inline-block rounded-full border-2 border-pickle-yellow bg-dark-grey px-2 py-0.5 text-[10px] font-black uppercase text-pickle-yellow">
              Insert match
            </div>
          </div>
        </div>

        <nav className="relative space-y-3" aria-label="App pages">
          {navItems.map((item) => (
            <button
              key={item.label}
              className={`nav-item ${activePage === item.pageId ? "is-active" : ""}`}
              type="button"
              onClick={() => onPageChange(item.pageId)}
              aria-current={activePage === item.pageId ? "page" : undefined}
            >
              <item.icon size={19} />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="cabinet-ledger relative mt-8 rounded-xl border-3 border-pickle-yellow bg-deep-green p-4">
          <p className="text-xs font-black uppercase text-pickle-yellow">Signed in</p>
          <p className="mt-1 truncate font-black text-warm-white">{profile?.display_name ?? profile?.email ?? "Club player"}</p>
          <p className="mt-2 text-xs font-bold text-cream/80">Private court access</p>
          <div className="cabinet-lights" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
        </div>
      </aside>

      <div className="min-w-0 pb-24 lg:pb-0">
        <header className="club-header sticky top-0 z-20 border-b-3 border-deep-green bg-warm-white px-4 py-3 lg:px-8">
          <div className="mx-auto flex max-w-dashboard items-center justify-between gap-3">
            <div className="flex items-center gap-3 lg:hidden">
              <div className="club-mark grid h-10 w-10 place-items-center rounded-full border-3 border-deep-green bg-pickle-yellow text-deep-green">
                <PaddleMark size={22} />
              </div>
              <div className="club-logo-title text-2xl text-deep-green">Pickle Club</div>
            </div>
            <div className="hidden lg:block">
              <p className="text-sm font-black uppercase text-clay-red">Clubhouse cartridge loaded</p>
              <h1 className="font-display text-4xl leading-none text-deep-green">Record the rally</h1>
            </div>
            <div className="flex items-center gap-3">
              {profile?.avatar_url ? (
                <img className="h-11 w-11 rounded-full border-3 border-deep-green" src={profile.avatar_url} alt="" />
              ) : (
                <div className="grid h-11 w-11 place-items-center rounded-full border-3 border-deep-green bg-pickle-yellow font-display text-deep-green">
                  {(profile?.display_name ?? profile?.email ?? "P").slice(0, 1).toUpperCase()}
                </div>
              )}
              <RetroButton variant="secondary" className="hidden gap-2 px-3 py-2 text-sm sm:inline-flex" onClick={() => signOut.mutate()}>
                <LogOut size={16} />
                Sign out
              </RetroButton>
            </div>
          </div>
        </header>

        <div className="cabinet-screen">
          {children}
        </div>
      </div>

      <nav className={`mobile-bottom-nav ${navItems.length === 6 ? "grid-cols-6" : "grid-cols-5"} lg:hidden`} aria-label="App pages">
        {navItems.map((item) => (
          <button
            key={item.label}
            className={activePage === item.pageId ? "is-active" : ""}
            type="button"
            onClick={() => onPageChange(item.pageId)}
            aria-current={activePage === item.pageId ? "page" : undefined}
          >
            <item.icon size={20} />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
