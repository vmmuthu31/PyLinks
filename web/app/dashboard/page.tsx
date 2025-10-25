"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import DashboardMain from "@/components/dashboard/DashboardMain";
import { useAppSelector } from "@/lib/store/hooks";

export default function DashboardPage() {
  const { ready, authenticated } = usePrivy();
  const router = useRouter();
  const { merchant } = useAppSelector((state) => state.merchant);

  useEffect(() => {
    if (ready && !authenticated) {
      router.push("/");
    }
  }, [ready, authenticated, router]);

  if (!ready || !authenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return <DashboardMain />;
}
