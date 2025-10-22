import { randomBytes } from "crypto";
import QRCode from "qrcode";
import {
  PaymentSession,
  PaymentStatus,
  IPaymentSession,
} from "../models/PaymentSession";
import { Merchant } from "../models/Merchant";
import { verifyPayment } from "pylinks/sdk";

export interface CreatePaymentSessionDto {
  merchantId: string;
  amount: number;
  description?: string;
  currency?: string;
  expiresIn?: number;
  metadata?: Record<string, any>;
}

export interface PaymentSessionResponse {
  sessionId: string;
  amount: number;
  currency: string;
  description?: string;
  recipientAddress: string;
  status: PaymentStatus;
  qrCode: string;
  qrCodeDataUrl: string;
  expiresAt: Date;
  createdAt: Date;
}

export class PaymentSessionService {
  /**
   * Generate a unique session ID
   */
  private static generateSessionId(): string {
    return `ps_${randomBytes(16).toString("hex")}`;
  }

  /**
   * Create a new payment session
   */
  static async createSession(
    data: CreatePaymentSessionDto
  ): Promise<PaymentSessionResponse> {
    const merchant = await Merchant.findById(data.merchantId);
    if (!merchant) {
      throw new Error("Merchant not found");
    }

    if (!merchant.isActive) {
      throw new Error("Merchant account is inactive");
    }

    const sessionId = this.generateSessionId();

    const expiresIn = data.expiresIn || 30;
    const expiresAt = new Date(Date.now() + expiresIn * 60 * 1000);

    const session = await PaymentSession.create({
      sessionId,
      merchantId: data.merchantId,
      amount: data.amount,
      currency: data.currency || "PYUSD",
      description: data.description,
      recipientAddress: merchant.walletAddress,
      status: PaymentStatus.PENDING,
      expiresAt,
      metadata: data.metadata || {},
    });

    const qrData = JSON.stringify({
      sessionId,
      recipient: merchant.walletAddress,
      amount: data.amount,
      currency: data.currency || "PYUSD",
      description: data.description,
    });

    const qrCodeDataUrl = await QRCode.toDataURL(qrData, {
      errorCorrectionLevel: "H",
      width: 300,
      margin: 2,
    });

    return {
      sessionId: session.sessionId,
      amount: session.amount,
      currency: session.currency,
      description: session.description,
      recipientAddress: session.recipientAddress,
      status: session.status,
      qrCode: qrData,
      qrCodeDataUrl,
      expiresAt: session.expiresAt,
      createdAt: session.createdAt,
    };
  }

  /**
   * Get payment session by ID
   */
  static async getSession(sessionId: string): Promise<IPaymentSession | null> {
    return await PaymentSession.findOne({ sessionId }).populate("merchantId");
  }

  /**
   * Verify payment for a session
   */
  static async verifySessionPayment(sessionId: string): Promise<{
    status: string;
    txHash?: string;
    blockNumber?: number;
  }> {
    const session = await this.getSession(sessionId);

    if (!session) {
      throw new Error("Payment session not found");
    }
    if (session.status === PaymentStatus.PAID) {
      return {
        status: "paid",
        txHash: session.txHash,
        blockNumber: session.blockNumber,
      };
    }

    if (new Date() > session.expiresAt) {
      await PaymentSession.updateOne(
        { sessionId },
        { status: PaymentStatus.EXPIRED }
      );
      return { status: "expired" };
    }

    const result = await verifyPayment({
      sessionId,
      recipient: session.recipientAddress,
      amount: session.amount,
    });

    if (result.status === "paid") {
      await PaymentSession.updateOne(
        { sessionId },
        {
          status: PaymentStatus.PAID,
          txHash: result.txHash,
          blockNumber: result.timestamp,
          paidAt: new Date(),
        }
      );
    }

    return result;
  }

  /**
   * Get merchant's payment sessions
   */
  static async getMerchantSessions(
    merchantId: string,
    filters?: {
      status?: PaymentStatus;
      limit?: number;
      skip?: number;
    }
  ): Promise<IPaymentSession[]> {
    const query: any = { merchantId };

    if (filters?.status) {
      query.status = filters.status;
    }

    return await PaymentSession.find(query)
      .sort({ createdAt: -1 })
      .limit(filters?.limit || 50)
      .skip(filters?.skip || 0);
  }

  /**
   * Update session status
   */
  static async updateSessionStatus(
    sessionId: string,
    status: PaymentStatus,
    txHash?: string,
    blockNumber?: number
  ): Promise<void> {
    const updateData: any = { status };

    if (status === PaymentStatus.PAID) {
      updateData.paidAt = new Date();
      if (txHash) updateData.txHash = txHash;
      if (blockNumber) updateData.blockNumber = blockNumber;
    }

    await PaymentSession.updateOne({ sessionId }, updateData);
  }

  /**
   * Mark expired sessions
   */
  static async markExpiredSessions(): Promise<number> {
    const result = await PaymentSession.updateMany(
      {
        status: PaymentStatus.PENDING,
        expiresAt: { $lt: new Date() },
      },
      {
        status: PaymentStatus.EXPIRED,
      }
    );

    return result.modifiedCount;
  }
}
