import { ReactNode } from "react";

export default function Card({ children }: { children: ReactNode }) {
  return (
    <div className="bg-white shadow-sm rounded-xl border border-gray-100 p-6">
      {children}
    </div>
  );
}