"use client";

import DashboardLayout from "@/components/dashboard/DashboardLayout";
import CleanDashboard from "@/components/dashboard/CleanDashboard";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";

function DashboardFallback() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin mx-auto" />
        <p className="text-muted-foreground">Loading PyLinks Dashboard...</p>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <DashboardLayout>
      <Suspense fallback={<DashboardFallback />}>
        <CleanDashboard />
      </Suspense>
    </DashboardLayout>
  );
}
