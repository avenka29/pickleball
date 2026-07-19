import type { HTMLAttributes, MouseEvent, ReactNode } from "react";
import { useRef } from "react";

type RetroPanelProps = HTMLAttributes<HTMLElement> & {
  as?: "article" | "section" | "div";
  children: ReactNode;
  strong?: boolean;
  spotlight?: boolean;
};

export function RetroPanel({
  as: Component = "section",
  children,
  className = "",
  strong = false,
  spotlight = false,
  onMouseMove,
  ...props
}: RetroPanelProps) {
  const nodeRef = useRef<HTMLElement | null>(null);

  const handleMouseMove = (event: MouseEvent<HTMLElement>) => {
    if (spotlight && nodeRef.current) {
      const rect = nodeRef.current.getBoundingClientRect();
      nodeRef.current.style.setProperty("--spot-x", `${event.clientX - rect.left}px`);
      nodeRef.current.style.setProperty("--spot-y", `${event.clientY - rect.top}px`);
    }
    onMouseMove?.(event);
  };

  return (
    <Component
      ref={nodeRef as never}
      className={`${strong ? "retro-panel-strong" : "retro-panel"} ${spotlight ? "retro-panel-spotlight" : ""} ${className}`}
      onMouseMove={handleMouseMove}
      {...props}
    >
      {children}
    </Component>
  );
}
