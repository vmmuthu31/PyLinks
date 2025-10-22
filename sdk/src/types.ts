export type PaymentStatusType = "pending" | "paid" | "expired" | "failed";

export type Network = "sepolia" | "mainnet";

export interface PyLinksConfig {
  apiKey?: string;
  network?: Network;
  baseUrl?: string;
}

export interface MerchantRegistration {
  email: string;
  name: string;
  walletAddress: string;
  webhookUrl?: string;
}

export interface MerchantProfile {
  merchantId: string;
  email: string;
  name: string;
  walletAddress: string;
  webhookUrl?: string;
  isActive: boolean;
  createdAt: string;
}

export interface ApiKeyResponse {
  apiKey: string;
  apiSecret: string;
}

export interface CreatePaymentParams {
  amount: number;
  description?: string;
  metadata?: Record<string, any>;
  webhookUrl?: string;
  expiryMinutes?: number;
}

export interface PaymentSession {
  sessionId: string;
  amount: number;
  currency: string;
  description?: string;
  recipientAddress: string;
  status: PaymentStatusType;
  qrCode: string;
  qrCodeDataUrl: string;
  expiresAt: string;
  createdAt: string;
}

export interface PaymentStatus {
  sessionId: string;
  status: PaymentStatusType;
  amount: number;
  txHash?: string;
  paidAt?: string;
}

export interface VerifyPaymentParams {
  sessionId: string;
  recipient: string;
  amount: number;
}

export interface VerifyPaymentResult {
  status: "paid" | "pending";
  txHash?: string;
  sessionId: string;
  timestamp?: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}
