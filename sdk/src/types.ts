export interface PaymentSessionParams {
  orderId: string;
  amount: number;
  currency: "PYUSD";
  recipient: string;
}

export interface PaymentSession {
  sessionId: string;
  qrPayload: string;
  status: "pending" | "paid" | "failed";
}
