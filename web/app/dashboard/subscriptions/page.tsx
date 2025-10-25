"use client";

import { Suspense } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Loader2 } from "lucide-react";
import Subscriptions from "@/components/subscriptions/Subscriptions";

function SubscriptionsFallback() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin mx-auto" />
        <p className="text-muted-foreground">Loading subscriptions...</p>
      </div>
    </div>
  );
}

export default function SubscriptionsPage() {
  return (
    <DashboardLayout>
      <Suspense fallback={<SubscriptionsFallback />}>
        <Subscriptions />
      </Suspense>
    </DashboardLayout>
  );
}
