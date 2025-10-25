"use client";

import { Suspense } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import BulkPayMultipleMerchants from "@/components/bulk/BulkPayMultipleMerchants";
import { Loader2 } from "lucide-react";

function BulkMultipleFallback() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin mx-auto" />
        <p className="text-muted-foreground">Loading bulk payment form...</p>
      </div>
    </div>
  );
}

export default function BulkMultiplePage() {
  return (
    <DashboardLayout>
      <Suspense fallback={<BulkMultipleFallback />}>
        <BulkPayMultipleMerchants />
      </Suspense>
    </DashboardLayout>
  );
}
