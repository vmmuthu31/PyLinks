"use client";

import { Suspense } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Loader2 } from "lucide-react";
import Gamification from "@/components/gamification/Gamification";

function GamificationFallback() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin mx-auto" />
        <p className="text-muted-foreground">Loading Spin & Win...</p>
      </div>
    </div>
  );
}

export default function GamificationPage() {
  return (
    <DashboardLayout>
      <Suspense fallback={<GamificationFallback />}>
        <Gamification />
      </Suspense>
    </DashboardLayout>
  );
}
