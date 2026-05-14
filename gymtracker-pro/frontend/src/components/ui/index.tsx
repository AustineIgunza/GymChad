import React from "react";

// ─── CARD ─────────────────────────────────────────────────────────────
interface CardProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function Card({ title, children, className = "" }: CardProps) {
  return (
    <div className={`bg-gray-800 border border-gray-700 rounded-xl p-4 lg:p-6 ${className}`}>
      {title && <h2 className="text-lg font-semibold mb-3">{title}</h2>}
      {children}
    </div>
  );
}

// ─── BUTTON ───────────────────────────────────────────────────────────
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  children: React.ReactNode;
}

export function Button({
  variant = "secondary",
  size = "md",
  loading = false,
  children,
  className = "",
  disabled,
  ...props
}: ButtonProps) {
  const base = "font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2";

  const variants: Record<string, string> = {
    primary: "bg-blue-600 hover:bg-blue-700 text-white",
    secondary: "bg-gray-700 hover:bg-gray-600 text-white",
    danger: "bg-red-600 hover:bg-red-700 text-white",
    ghost: "bg-transparent hover:bg-gray-700 text-gray-300",
  };

  const sizes: Record<string, string> = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2.5 text-sm",
    lg: "px-6 py-3 text-base",
  };

  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {children}
    </button>
  );
}

// ─── INPUT ────────────────────────────────────────────────────────────
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export function Input({ label, className = "", ...props }: InputProps) {
  return (
    <div className="w-full">
      {label && <label className="block text-xs text-gray-400 mb-1">{label}</label>}
      <input
        className={`w-full px-3 py-2.5 rounded-lg bg-gray-700 text-white placeholder-gray-500 border-2 border-gray-600 focus:border-blue-500 focus:outline-none text-sm ${className}`}
        {...props}
      />
    </div>
  );
}

// ─── BADGE ────────────────────────────────────────────────────────────
interface BadgeProps {
  color?: "blue" | "green" | "red" | "yellow" | "purple" | "gray";
  children: React.ReactNode;
  className?: string;
}

export function Badge({ color = "blue", children, className = "" }: BadgeProps) {
  const colors: Record<string, string> = {
    blue: "bg-blue-900/50 text-blue-300 border-blue-700",
    green: "bg-green-900/50 text-green-300 border-green-700",
    red: "bg-red-900/50 text-red-300 border-red-700",
    yellow: "bg-yellow-900/50 text-yellow-300 border-yellow-700",
    purple: "bg-purple-900/50 text-purple-300 border-purple-700",
    gray: "bg-gray-700 text-gray-300 border-gray-600",
  };

  return (
    <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full border ${colors[color]} ${className}`}>
      {children}
    </span>
  );
}
