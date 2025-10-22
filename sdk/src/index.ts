import axios, { AxiosInstance } from "axios";
import type {
  PyLinksConfig,
  CreatePaymentParams,
  PaymentSession,
  PaymentStatus,
  ApiResponse,
} from "./types";

export * from "./types";
export * from "./pyusd";
export * from "./qr";

export class PyLinks {
  private apiKey: string;
  private network: "sepolia" | "mainnet";
  private baseUrl: string;
  private client: AxiosInstance;

  constructor(config: PyLinksConfig) {
    this.apiKey = config.apiKey;
    this.network = config.network || "sepolia";
    this.baseUrl = config.baseUrl || "http://localhost:8000/api";

    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
    });
  }

  /**
   * Create a new payment session
   */
  async createPayment(params: CreatePaymentParams): Promise<PaymentSession> {
    const response = await this.client.post<ApiResponse<PaymentSession>>(
      "/payments/create",
      params
    );

    if (!response.data.success || !response.data.data) {
      throw new Error(
        response.data.error?.message || "Failed to create payment"
      );
    }

    return response.data.data;
  }

  /**
   * Get payment session status
   */
  async getPaymentStatus(sessionId: string): Promise<PaymentStatus> {
    const response = await this.client.get<ApiResponse<PaymentStatus>>(
      `/payments/${sessionId}`
    );

    if (!response.data.success || !response.data.data) {
      throw new Error(
        response.data.error?.message || "Failed to get payment status"
      );
    }

    return response.data.data;
  }

  /**
   * Verify payment manually
   */
  async verifyPayment(sessionId: string): Promise<PaymentStatus> {
    const response = await this.client.post<ApiResponse<PaymentStatus>>(
      `/payments/${sessionId}/verify`
    );

    if (!response.data.success || !response.data.data) {
      throw new Error(
        response.data.error?.message || "Failed to verify payment"
      );
    }

    return response.data.data;
  }

  /**
   * List all payment sessions
   */
  async listPayments(filters?: {
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<PaymentSession[]> {
    const params = new URLSearchParams();
    if (filters?.status) params.append("status", filters.status);
    if (filters?.limit) params.append("limit", filters.limit.toString());
    if (filters?.offset) params.append("skip", filters.offset.toString());

    const response = await this.client.get<
      ApiResponse<{ payments: PaymentSession[] }>
    >(`/payments/merchant/sessions?${params.toString()}`);

    if (!response.data.success || !response.data.data) {
      throw new Error(
        response.data.error?.message || "Failed to list payments"
      );
    }

    return response.data.data.payments || [];
  }
}

export default PyLinks;
