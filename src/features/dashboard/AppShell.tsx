import { Home, LogOut, Medal, Shield, Swords, Trophy } from "lucide-react";
import { useMemo } from "react";
import type { ReactNode } from "react";
import { RetroButton } from "../../components/RetroButton";
import { useSignOut } from "../auth/api";
import type { Profile, Theme } from "./types";

type AppShellProps = {
  profile: Profile | null;
  children: ReactNode;
  activePage: string;
  onPageChange: (page: string) => void;
  activeTheme?: Theme | null;
};

const playerNav = [
  { label: "Home", icon: Home, pageId: "home" },
  { label: "Track", icon: Swords, pageId: "record" },
  { label: "Rankings", icon: Medal, pageId: "rankings" },
  { label: "Bracket", icon: Trophy, pageId: "tournaments" },
];

function PaddleMark({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 44 44" fill="none" aria-hidden="true">
      <path d="M23 26 L31 36 C32.5 38 30 40.5 28 38.5 L20 29" fill="#8A5739" stroke="currentColor" strokeWidth="3" />
      <path d="M9 7 C16 -1 31 3 35 13 C39 24 31 34 20 33 C9 32 2 16 9 7Z" fill="var(--color-clay)" stroke="currentColor" strokeWidth="3" />
      <path d="M12 12 C17 6 27 8 31 15" stroke="var(--color-cream)" strokeWidth="3" strokeLinecap="round" />
      <circle className="logo-ball" cx="34" cy="10" r="5" fill="var(--color-yellow)" stroke="currentColor" strokeWidth="3" />
    </svg>
  );
}

export function AppShell({ profile, children, activePage, onPageChange, activeTheme }: AppShellProps) {
  const signOut = useSignOut();
  const navItems = useMemo(
    () => (profile?.role === "admin" ? [...playerNav, { label: "Admin", icon: Shield, pageId: "admin" }] : playerNav),
    [profile?.role],
  );

  return (
    <div className="game-shell min-h-screen text-ink lg:grid lg:grid-cols-[252px_1fr]">
      <aside className="game-rail hidden min-h-screen p-4 lg:sticky lg:top-0 lg:block">
        <div className="brand-ticket">
          <div className="brand-paddle">
            <PaddleMark size={42} />
          </div>
          <div>
            <p>Pickle</p>
            <strong>Club</strong>
          </div>
        </div>

        <nav className="nav-stack" aria-label="App pages">
          {navItems.map((item) => (
            <button
              key={item.pageId}
              className={`nav-card ${activePage === item.pageId ? "is-active" : ""}`}
              type="button"
              onClick={() => onPageChange(item.pageId)}
              aria-current={activePage === item.pageId ? "page" : undefined}
            >
              <item.icon size={20} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      <div className="min-w-0 pb-24 lg:pb-0">
        <header className="top-scorebar">
          <ThemeTicker theme={activeTheme} />
          <div className="mx-auto flex max-w-dashboard items-center justify-between gap-3">
            <button className="mobile-brand" type="button" onClick={() => onPageChange("home")} aria-label="Go home">
              <PaddleMark size={32} />
              <span>Pickle Club</span>
            </button>
            <div className="hidden min-w-0 lg:block">
              <h1>{pageTitle(activePage)}</h1>
            </div>
            <div className="profile-chip">
              {profile?.avatar_url ? <img src={profile.avatar_url} alt="" /> : <span>{(profile?.display_name ?? profile?.email ?? "P").slice(0, 1).toUpperCase()}</span>}
              <RetroButton variant="secondary" className="hidden px-3 py-2 text-sm sm:inline-flex" onClick={() => signOut.mutate()}>
                <LogOut size={16} />
                Sign out
              </RetroButton>
            </div>
          </div>
        </header>

        <div className="screen-drop">{children}</div>
      </div>

      <nav className="mobile-bottom-nav lg:hidden" style={{ gridTemplateColumns: `repeat(${navItems.length}, minmax(0, 1fr))` }} aria-label="App pages">
        {navItems.map((item) => (
          <button
            key={item.pageId}
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

function ThemeTicker({ theme }: { theme?: Theme | null }) {
  const themeName = theme?.name ?? "Open Play";
  const description = theme?.description ?? "Regular ratings are active. Win the point, record the match, climb the board.";

  return (
    <div className="theme-ticker" aria-label={`Active theme: ${themeName}. ${description}`}>
      <div className="mx-auto max-w-dashboard">
        <span>Active theme</span>
        <strong>{themeName}</strong>
        <p>{description}</p>
      </div>
    </div>
  );
}

function pageTitle(page: string) {
  switch (page) {
    case "record":
      return "Track a match";
    case "rankings":
      return "Rankings";
    case "history":
      return "Replay feed";
    case "tournaments":
      return "Bracket board";
    case "admin":
      return "Admin controls";
    default:
      return "Home";
  }
}
