"use client";

import { Suspense } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import ReceiveMoney from "@/components/wallet/ReceiveMoney";
import { Loader2 } from "lucide-react";

function ReceiveMoneyFallback() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin mx-auto" />
        <p className="text-muted-foreground">Loading receive money form...</p>
      </div>
    </div>
  );
}

export default function ReceiveMoneyPage() {
  return (
    <DashboardLayout>
      <Suspense fallback={<ReceiveMoneyFallback />}>
        <ReceiveMoney />
      </Suspense>
    </DashboardLayout>
  );
}
