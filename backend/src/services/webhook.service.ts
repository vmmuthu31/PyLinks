import crypto from "crypto";
import axios from "axios";
import { Merchant, IMerchant } from "../models/Merchant";
import { PaymentSession, IPaymentSession } from "../models/PaymentSession";

export interface WebhookPayload {
  event: "payment.paid" | "payment.expired" | "payment.failed";
  sessionId: string;
  merchantId: string;
  amount: number;
  currency: string;
  status: string;
  txHash?: string;
  blockNumber?: number;
  timestamp: string;
  metadata?: Record<string, any>;
}

export class WebhookService {
  /**
   * Generate webhook signature for verification
   */
  private static generateSignature(payload: string, secret: string): string {
    return crypto.createHmac("sha256", secret).update(payload).digest("hex");
  }

  /**
   * Send webhook to merchant
   */
  static async sendWebhook(
    merchant: IMerchant,
    payload: WebhookPayload,
    retryCount: number = 0
  ): Promise<boolean> {
    if (!merchant.webhookUrl) {
      console.log(`No webhook URL configured for merchant ${merchant._id}`);
      return false;
    }

    const payloadString = JSON.stringify(payload);
    const signature = this.generateSignature(
      payloadString,
      merchant.webhookSecret || merchant.apiSecret
    );

    const maxRetries = 3;
    const retryDelays = [1000, 5000, 15000];

    try {
      const response = await axios.post(merchant.webhookUrl, payload, {
        headers: {
          "Content-Type": "application/json",
          "X-PyLinks-Signature": signature,
          "X-PyLinks-Event": payload.event,
          "X-PyLinks-Timestamp": payload.timestamp,
        },
        timeout: 10000,
      });

      if (response.status >= 200 && response.status < 300) {
        console.log(`✅ Webhook delivered to ${merchant.webhookUrl}`);
        return true;
      }

      throw new Error(`Webhook returned status ${response.status}`);
    } catch (error: any) {
      console.error(
        `❌ Webhook delivery failed (attempt ${retryCount + 1}):`,
        error.message
      );

      if (retryCount < maxRetries) {
        const delay = retryDelays[retryCount];
        console.log(`⏳ Retrying webhook in ${delay}ms...`);

        await new Promise((resolve) => setTimeout(resolve, delay));
        return this.sendWebhook(merchant, payload, retryCount + 1);
      }

      return false;
    }
  }

  /**
   * Trigger payment webhook
   */
  static async triggerPaymentWebhook(
    session: IPaymentSession,
    event: "payment.paid" | "payment.expired" | "payment.failed"
  ): Promise<void> {
    const merchant = (await Merchant.findById(session.merchantId)) as
      | (IMerchant & { _id: any })
      | null;
    if (!merchant) {
      console.error("Merchant not found for webhook");
      return;
    }

    const payload: WebhookPayload = {
      event,
      sessionId: session.sessionId,
      merchantId: merchant._id.toString(),
      amount: session.amount,
      currency: session.currency,
      status: session.status,
      txHash: session.txHash,
      blockNumber: session.blockNumber,
      timestamp: new Date().toISOString(),
      metadata: session.metadata,
    };

    await PaymentSession.updateOne(
      { sessionId: session.sessionId },
      {
        $inc: { webhookAttempts: 1 },
        webhookLastAttempt: new Date(),
      }
    );

    const delivered = await this.sendWebhook(merchant, payload);

    if (delivered) {
      await PaymentSession.updateOne(
        { sessionId: session.sessionId },
        { webhookDelivered: true }
      );
    }
  }

  /**
   * Retry failed webhooks
   */
  static async retryFailedWebhooks(): Promise<void> {
    const failedSessions = await PaymentSession.find({
      webhookDelivered: false,
      webhookAttempts: { $lt: 5 },
      status: { $in: ["paid", "expired"] },
    }).populate("merchantId");

    console.log(`🔄 Retrying ${failedSessions.length} failed webhooks...`);

    for (const session of failedSessions) {
      const event =
        session.status === "paid" ? "payment.paid" : "payment.expired";
      await this.triggerPaymentWebhook(session, event);
    }
  }

  /**
   * Verify webhook signature (for merchants to use)
   */
  static verifyWebhookSignature(
    payload: string,
    signature: string,
    secret: string
  ): boolean {
    const expectedSignature = this.generateSignature(payload, secret);
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }
}
