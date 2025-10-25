"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import AuthCard from "@/components/auth/AuthCard";
import { useAppSelector } from "@/lib/store/hooks";

export default function Home() {
  const { ready, authenticated } = usePrivy();
  const router = useRouter();
  const { merchant } = useAppSelector((state) => state.merchant);

  useEffect(() => {
    // If user is authenticated and has merchant data, redirect to dashboard
    if (ready && authenticated && merchant) {
      router.push("/dashboard");
    }
  }, [ready, authenticated, merchant, router]);

  // Show login card if not authenticated
  if (!ready) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (authenticated && merchant) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return <AuthCard />;
}
