"use client";

import { Suspense } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import BulkPaySingleMerchant from "@/components/bulk/BulkPaySingleMerchant";
import { Loader2 } from "lucide-react";

function BulkSingleFallback() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin mx-auto" />
        <p className="text-muted-foreground">Loading bulk payment form...</p>
      </div>
    </div>
  );
}

export default function BulkSinglePage() {
  return (
    <DashboardLayout>
      <Suspense fallback={<BulkSingleFallback />}>
        <BulkPaySingleMerchant />
      </Suspense>
    </DashboardLayout>
  );
}
