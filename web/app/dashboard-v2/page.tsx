"use client";

import { Suspense } from "react";
import EnhancedDashboard from "@/components/dashboard/EnhancedDashboard";
import { Loader2 } from "lucide-react";

function DashboardFallback() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin mx-auto" />
        <p className="text-muted-foreground">Loading PyLinks Dashboard...</p>
      </div>
    </div>
  );
}

export default function DashboardV2Page() {
  return (
    <Suspense fallback={<DashboardFallback />}>
      <EnhancedDashboard />
    </Suspense>
  );
}
