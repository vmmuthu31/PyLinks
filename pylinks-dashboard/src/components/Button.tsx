import { ReactNode } from "react";

interface ButtonProps {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary";
  disabled?: boolean;
}

export default function Button({ children, onClick, variant = "primary", disabled }: ButtonProps) {
  const base = "px-5 py-2 rounded-lg text-sm font-medium transition focus:outline-none";
  const styles =
    variant === "primary"
      ? "bg-black text-white hover:bg-gray-900"
      : "bg-gray-100 text-gray-700 hover:bg-gray-200";

  return (
    <button onClick={onClick} disabled={disabled} className={`${base} ${styles} disabled:opacity-50`}>
      {children}
    </button>
  );
}