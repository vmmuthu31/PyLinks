"use client";

import { Suspense } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Loader2 } from "lucide-react";
import WalletHistory from "@/components/wallet/WalletHistory";

function WalletHistoryFallback() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin mx-auto" />
        <p className="text-muted-foreground">Loading wallet history...</p>
      </div>
    </div>
  );
}

export default function WalletHistoryPage() {
  return (
    <DashboardLayout>
      <Suspense fallback={<WalletHistoryFallback />}>
        <WalletHistory />
      </Suspense>
    </DashboardLayout>
  );
}
