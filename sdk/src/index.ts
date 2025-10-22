import axios, { AxiosInstance } from "axios";
import type {
  PyLinksConfig,
  CreatePaymentParams,
  PaymentSession,
  PaymentStatus,
  ApiResponse,
  MerchantRegistration,
  MerchantProfile,
  ApiKeyResponse,
} from "./types";

export * from "./types";
export * from "./pyusd";
export * from "./qr";

export class PyLinks {
  private apiKey?: string;
  private network: "sepolia" | "mainnet";
  private baseUrl: string;
  private client: AxiosInstance;

  constructor(config: PyLinksConfig) {
    this.apiKey = config.apiKey;
    this.network = config.network || "sepolia";
    this.baseUrl = config.baseUrl || "https://pylinks-backend.vercel.app/api";

    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (this.apiKey) {
      this.client.defaults.headers.common["x-api-key"] = this.apiKey;
    }
  }

  /**
   * Set API key after initialization
   */
  setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
    this.client.defaults.headers.common["x-api-key"] = apiKey;
  }

  /**
   * Register a new merchant (Step 1)
   */
  async registerMerchant(params: MerchantRegistration): Promise<{
    merchantId: string;
    email: string;
    name: string;
    walletAddress: string;
  }> {
    const response = await this.client.post<
      ApiResponse<{
        merchantId: string;
        email: string;
        name: string;
        walletAddress: string;
      }>
    >("/merchants/register", params);

    if (!response.data.success || !response.data.data) {
      throw new Error(
        response.data.error?.message || "Failed to register merchant"
      );
    }

    return response.data.data;
  }

  /**
   * Create API key for registered merchant (Step 2)
   */
  async createApiKey(merchantId: string): Promise<ApiKeyResponse> {
    const response = await this.client.post<ApiResponse<ApiKeyResponse>>(
      "/merchants/create-api-key",
      { merchantId }
    );

    if (!response.data.success || !response.data.data) {
      throw new Error(
        response.data.error?.message || "Failed to create API key"
      );
    }

    const { apiKey } = response.data.data;
    this.setApiKey(apiKey);

    return response.data.data;
  }

  /**
   * Get merchant profile (requires API key)
   */
  async getMerchantProfile(): Promise<MerchantProfile> {
    if (!this.apiKey) {
      throw new Error(
        "API key is required. Call setApiKey() or createApiKey() first."
      );
    }

    const response = await this.client.get<ApiResponse<MerchantProfile>>(
      "/merchants/profile"
    );

    if (!response.data.success || !response.data.data) {
      throw new Error(
        response.data.error?.message || "Failed to get merchant profile"
      );
    }

    return response.data.data;
  }

  /**
   * Create a new payment session (requires API key)
   */
  async createPayment(params: CreatePaymentParams): Promise<PaymentSession> {
    if (!this.apiKey) {
      throw new Error(
        "API key is required. Call setApiKey() or createApiKey() first."
      );
    }

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
   * Get payment session status (requires API key)
   */
  async getPaymentStatus(sessionId: string): Promise<PaymentStatus> {
    if (!this.apiKey) {
      throw new Error(
        "API key is required. Call setApiKey() or createApiKey() first."
      );
    }

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
   * Verify payment manually (requires API key)
   */
  async verifyPayment(sessionId: string): Promise<PaymentStatus> {
    if (!this.apiKey) {
      throw new Error(
        "API key is required. Call setApiKey() or createApiKey() first."
      );
    }

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
   * List all payment sessions (requires API key)
   */
  async listPayments(filters?: {
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<PaymentSession[]> {
    if (!this.apiKey) {
      throw new Error(
        "API key is required. Call setApiKey() or createApiKey() first."
      );
    }
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
