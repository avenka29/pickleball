import type { ButtonHTMLAttributes, ReactNode } from "react";

type RetroButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: "primary" | "secondary" | "highlight" | "danger";
};

const variantClass = {
  primary: "retro-button-primary",
  secondary: "retro-button-secondary",
  highlight: "retro-button-highlight",
  danger: "retro-button-danger",
};

export function RetroButton({ children, className = "", variant = "primary", ...props }: RetroButtonProps) {
  return (
    <button className={`retro-button ${variantClass[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}
