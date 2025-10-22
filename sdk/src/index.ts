import { v4 as uuidv4 } from "uuid";
import { generateQRCodePayload } from "./qr";
import type { PaymentSessionParams, PaymentSession } from "./types";

export async function createPaymentSession(
  params: PaymentSessionParams
): Promise<PaymentSession> {
  const sessionId = uuidv4();
  const payload = {
    sessionId,
    orderId: params.orderId,
    amount: params.amount,
    currency: params.currency,
    recipient: params.recipient,
  };
  const qrPayload = await generateQRCodePayload(payload);
  return { sessionId, qrPayload, status: "pending" };
}
