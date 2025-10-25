"use client";

import { Suspense } from "react";
import PaymentPage from "@/components/payment/PaymentPage";
import { Loader2 } from "lucide-react";

function PaymentPageFallback() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="h-8 w-8 animate-spin" />
    </div>
  );
}

export default function PayPage() {
  return (
    <Suspense fallback={<PaymentPageFallback />}>
      <PaymentPage />
    </Suspense>
  );
}
