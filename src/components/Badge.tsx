import type { HTMLAttributes, ReactNode } from "react";

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  children: ReactNode;
  tone?: "theme" | "provisional" | "win" | "loss" | "rank" | "neutral";
};

const toneClass = {
  theme: "badge-theme",
  provisional: "badge-provisional",
  win: "badge-win",
  loss: "badge-loss",
  rank: "badge-rank",
  neutral: "badge-neutral",
};

export function Badge({ children, className = "", tone = "neutral", ...props }: BadgeProps) {
  return (
    <span className={`badge ${toneClass[tone]} ${className}`} {...props}>
      {children}
    </span>
  );
}
