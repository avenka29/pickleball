import { CalendarDays } from "lucide-react";
import { Badge } from "../../components/Badge";
import type { Theme } from "./types";

type ThemeStripProps = {
  theme: Theme | null | undefined;
};

export function ThemeStrip({ theme }: ThemeStripProps) {
  return (
    <section className="theme-strip">
      <div className="flex items-center gap-3">
        <span className="rounded-full border-3 border-deep-green bg-warm-white p-2 text-deep-green">
          <CalendarDays size={20} />
        </span>
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="theme">{theme?.name ?? "Open Play"}</Badge>
            <span className="text-sm font-black uppercase text-deep-green">Active theme</span>
          </div>
          <p className="mt-1 font-bold text-deep-green">
            {theme?.description ?? "Regular ratings are active. Win the point, record the match, climb the board."}
          </p>
        </div>
      </div>
    </section>
  );
}
