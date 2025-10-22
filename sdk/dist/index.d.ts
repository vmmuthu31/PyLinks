type PaymentStatusType = "pending" | "paid" | "expired" | "failed";
type Network = "sepolia" | "mainnet";
interface PyLinksConfig {
    apiKey: string;
    network?: Network;
    baseUrl?: string;
}
interface CreatePaymentParams {
    amount: number;
    description?: string;
    metadata?: Record<string, any>;
    webhookUrl?: string;
    expiryMinutes?: number;
}
interface PaymentSession {
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
interface PaymentStatus {
    sessionId: string;
    status: PaymentStatusType;
    amount: number;
    txHash?: string;
    paidAt?: string;
}
interface VerifyPaymentParams {
    sessionId: string;
    recipient: string;
    amount: number;
}
interface VerifyPaymentResult {
    status: "paid" | "pending";
    txHash?: string;
    sessionId: string;
    timestamp?: number;
}
interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: {
        code: string;
        message: string;
    };
}

declare function verifyPayment({ sessionId, recipient, amount, }: {
    sessionId: string;
    recipient: string;
    amount: number;
}): Promise<{
    status: string;
    txHash: string;
    sessionId: string;
    timestamp: number;
} | {
    status: string;
    sessionId: string;
    txHash?: undefined;
    timestamp?: undefined;
}>;

declare function generateQRCodePayload(payload: any): Promise<string>;

declare class PyLinks {
    private apiKey;
    private network;
    private baseUrl;
    private client;
    constructor(config: PyLinksConfig);
    /**
     * Create a new payment session
     */
    createPayment(params: CreatePaymentParams): Promise<PaymentSession>;
    /**
     * Get payment session status
     */
    getPaymentStatus(sessionId: string): Promise<PaymentStatus>;
    /**
     * Verify payment manually
     */
    verifyPayment(sessionId: string): Promise<PaymentStatus>;
    /**
     * List all payment sessions
     */
    listPayments(filters?: {
        status?: string;
        limit?: number;
        offset?: number;
    }): Promise<PaymentSession[]>;
}

export { type ApiResponse, type CreatePaymentParams, type Network, type PaymentSession, type PaymentStatus, type PaymentStatusType, PyLinks, type PyLinksConfig, type VerifyPaymentParams, type VerifyPaymentResult, PyLinks as default, generateQRCodePayload, verifyPayment };
