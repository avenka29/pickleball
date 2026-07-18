import type { HTMLAttributes, ReactNode } from "react";

type RetroPanelProps = HTMLAttributes<HTMLElement> & {
  as?: "article" | "section" | "div";
  children: ReactNode;
  strong?: boolean;
};

export function RetroPanel({ as: Component = "section", children, className = "", strong = false, ...props }: RetroPanelProps) {
  return (
    <Component className={`${strong ? "retro-panel-strong" : "retro-panel"} ${className}`} {...props}>
      {children}
    </Component>
  );
}
