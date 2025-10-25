import { API_BASE_URL } from "../config";

export interface PaymentSession {
  sessionId: string;
  amount: number;
  currency: string;
  description?: string;
  status: "pending" | "paid" | "expired" | "failed";
  recipientAddress: string;
  txHash?: string;
  expiresAt: string;
  paidAt?: string;
  createdAt: string;
}

export interface RecordedPayment {
  paymentId: string;
  merchantId: string;
  txHash: string;
  amount: string;
  userWallet: string;
  memo?: string;
  status: "success" | "failed" | "pending";
  createdAt: string;
}

export class ApiService {
  private static baseUrl = API_BASE_URL;

  /**
   * Create a payment session
   */
  static async createPayment(params: {
    amount: number;
    description?: string;
    currency?: string;
    metadata?: Record<string, any>;
  }): Promise<PaymentSession> {
    const response = await fetch(`${this.baseUrl}/payments/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to create payment");
    }

    const data = await response.json();
    return data.data;
  }

  /**
   * Get payment session details
   */
  static async getPaymentSession(sessionId: string): Promise<PaymentSession> {
    const response = await fetch(`${this.baseUrl}/payments/${sessionId}`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to fetch payment");
    }

    const data = await response.json();
    return data.data;
  }

  /**
   * Verify payment
   */
  static async verifyPayment(sessionId: string): Promise<{
    verified: boolean;
    txHash?: string;
    amount?: string;
    status: string;
  }> {
    const response = await fetch(
      `${this.baseUrl}/payments/${sessionId}/verify`,
      {
        method: "POST",
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to verify payment");
    }

    const data = await response.json();
    return data.data;
  }

  /**
   * Record completed payment
   */
  static async recordPayment(
    apiKey: string,
    params: {
      txHash: string;
      amount: string;
      userWallet: string;
      memo?: string;
      status?: "success" | "failed" | "pending";
    }
  ): Promise<RecordedPayment> {
    const response = await fetch(`${this.baseUrl}/payments/record`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to record payment");
    }

    const data = await response.json();
    return data.data;
  }

  /**
   * Get merchant's recorded payments
   */
  static async getRecordedPayments(
    apiKey: string,
    params?: {
      status?: string;
      limit?: number;
      skip?: number;
    }
  ): Promise<RecordedPayment[]> {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append("status", params.status);
    if (params?.limit) queryParams.append("limit", params.limit.toString());
    if (params?.skip) queryParams.append("skip", params.skip.toString());

    const url = `${this.baseUrl}/payments/records${
      queryParams.toString() ? `?${queryParams}` : ""
    }`;

    const response = await fetch(url, {
      headers: {
        "x-api-key": apiKey,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to fetch payments");
    }

    const data = await response.json();
    return data.data;
  }

  /**
   * Parse payment URL (deep link)
   */
  static parsePaymentUrl(url: string): { sessionId: string } | null {
    try {
      const parsedUrl = new URL(url);
      const sessionId =
        parsedUrl.searchParams.get("session") ||
        parsedUrl.pathname.split("/").pop();

      if (sessionId) {
        return { sessionId };
      }

      return null;
    } catch {
      return null;
    }
  }
}
