import { Request } from "express";

export enum PaymentStatus {
  PENDING = "pending",
  PAID = "paid",
  EXPIRED = "expired",
  FAILED = "failed",
}

export enum Network {
  SEPOLIA = "sepolia",
  MAINNET = "mainnet",
}

export enum WebhookEventType {
  PAYMENT_CREATED = "payment.created",
  PAYMENT_PAID = "payment.paid",
  PAYMENT_EXPIRED = "payment.expired",
  PAYMENT_FAILED = "payment.failed",
}

export interface AuthRequest extends Request {
  merchant?: {
    id: string;
    apiKey: string;
    name: string;
  };
}

export interface CreatePaymentDTO {
  amount: number;
  description?: string;
  metadata?: Record<string, any>;
  webhookUrl?: string;
  expiryMinutes?: number;
}

export interface PaymentSessionDTO {
  sessionId: string;
  merchantId: string;
  amount: number;
  amountInWei: string;
  recipientAddress: string;
  status: PaymentStatus;
  description?: string;
  metadata?: Record<string, any>;
  qrCode?: string;
  webhookUrl?: string;
  expiresAt: Date;
  createdAt: Date;
}

export interface WebhookPayload {
  eventType: WebhookEventType;
  sessionId: string;
  status: PaymentStatus;
  amount: number;
  txHash?: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface BlockchainEvent {
  from: string;
  to: string;
  value: string;
  transactionHash: string;
  blockNumber: number;
}
