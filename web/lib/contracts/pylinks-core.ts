import { ethers } from "ethers";
import PyLinksCore from "../../abi/PyLinksCore.json";

// Contract addresses on Sepolia
export const CONTRACTS = {
  PYLINKS_CORE: "0xF67dd85750183cf55B875B59ceB0604C506480B6",
  NFT_RECEIPT: "0xDa348E77743be4dfD087c8d9C79F808F782A0218",
  PYUSD: "0xCaC524BcA292aaade2DF8A05cC58F0a65B1B3bB9", // Sepolia PYUSD
  PYTH: "0xDd24F84d36BF92C65F92307595335bdFab5Bbd21", // Pyth Sepolia
} as const;

// RPC URL for Sepolia
export const SEPOLIA_RPC =
  process.env.NEXT_PUBLIC_RPC_URL ||
  "https://ethereum-sepolia-rpc.publicnode.com";

export interface PaymentRequest {
  merchant: string;
  amount: string; // PYUSD amount (6 decimals)
  sessionId: string;
  description: string;
  referralCode?: string;
  splits?: SplitRecipient[];
  isOneTime?: boolean;
}

export interface EscrowPaymentRequest {
  merchant: string;
  customer: string;
  usdAmount: string; // USD amount (8 decimals)
  sessionId: string;
  description: string;
  autoRelease?: boolean;
}

export interface SubscriptionRequest {
  merchant: string;
  usdAmount: string; // USD amount (8 decimals)
  interval: number; // seconds
  maxPayments?: number; // 0 = unlimited
  description: string;
  autoRenew?: boolean;
}

export interface SplitRecipient {
  recipient: string;
  bps: number; // basis points (100 = 1%)
}

export interface PaymentDetails {
  id: number;
  merchant: string;
  customer: string;
  amount: string;
  sessionId: string;
  status: number; // PaymentStatus enum
  paymentType: number; // PaymentType enum
  createdAt: number;
  expiresAt: number;
}

export interface SubscriptionDetails {
  id: number;
  merchant: string;
  customer: string;
  usdAmount: string;
  interval: number;
  nextPayment: number;
  status: number; // SubscriptionStatus enum
}

export interface AffiliateDetails {
  id: number;
  name: string;
  referralCode: string;
  totalReferrals: number;
  totalVolume: string;
  tier: number;
}

export interface BulkPaymentRequest {
  merchant: string;
  amount: string; // PYUSD amount (6 decimals)
  description: string;
}

export interface BulkBatchDetails {
  id: number;
  customer: string;
  totalAmount: string;
  totalFees: string;
  paymentCount: number;
  processed: boolean;
  createdAt: number;
}

export interface BulkPaymentToSingleRequest {
  merchant: string;
  amounts: string[]; // PYUSD amounts (6 decimals)
  descriptions: string[];
}

export interface BulkEscrowPaymentRequest {
  merchants: string[];
  customers: string[];
  usdAmounts: string[]; // USD amounts (8 decimals)
  descriptions: string[];
  autoRelease?: boolean;
}

export class PyLinksCoreService {
  private contract: ethers.Contract;
  private provider: ethers.providers.JsonRpcProvider;
  private signer?: ethers.Signer;

  constructor(signerOrProvider?: ethers.Signer | ethers.providers.Provider) {
    this.provider = new ethers.providers.JsonRpcProvider(SEPOLIA_RPC);

    if (signerOrProvider) {
      if (ethers.Signer.isSigner(signerOrProvider)) {
        this.signer = signerOrProvider;
        this.contract = new ethers.Contract(
          CONTRACTS.PYLINKS_CORE,
          PyLinksCore,
          signerOrProvider
        );
      } else {
        this.contract = new ethers.Contract(
          CONTRACTS.PYLINKS_CORE,
          PyLinksCore,
          signerOrProvider
        );
      }
    } else {
      this.contract = new ethers.Contract(
        CONTRACTS.PYLINKS_CORE,
        PyLinksCore,
        this.provider
      );
    }
  }

  // ============ PAYMENT FUNCTIONS ============

  /**
   * Create a regular payment (10min expiry, one-time use)
   */
  async createPayment(
    request: PaymentRequest,
    options?: { gasLimit?: number }
  ): Promise<ethers.ContractTransaction> {
    if (!this.signer) throw new Error("Signer required for write operations");

    const splits = request.splits || [];
    const referralCode = request.referralCode
      ? ethers.utils.formatBytes32String(request.referralCode)
      : ethers.constants.HashZero;

    const txOptions: any = {};
    if (options?.gasLimit) {
      txOptions.gasLimit = options.gasLimit;
    }

    return await this.contract.createPayment(
      request.merchant,
      ethers.utils.parseUnits(request.amount, 6), // PYUSD has 6 decimals
      request.sessionId,
      request.description,
      referralCode,
      splits,
      request.isOneTime || true,
      txOptions
    );
  }
  async getPaymentBySessionId(
    sessionId: string
  ): Promise<PaymentDetails | null> {
    try {
      console.log("🔍 Contract: Getting payment for session:", sessionId);
      console.log("📄 Contract address:", this.contract.address);
      console.log("🌐 Provider:", (this.contract.provider as any).connection?.url || "unknown");
      
      // Get payment ID from session mapping
      const paymentId = await this.contract.sessionToPayment(sessionId);
      console.log("🔢 Raw payment ID from contract:", paymentId.toString());

      if (paymentId.isZero()) {
        console.log("❌ Payment ID is zero - session not found");
        return null;
      }

      const numericPaymentId = paymentId.toNumber();
      console.log("🔢 Numeric payment ID:", numericPaymentId);
      
      const payment = await this.getPayment(numericPaymentId);
      console.log("📋 Payment details:", payment);
      
      return payment;
    } catch (error: any) {
      console.error("❌ Error fetching payment by session:", error);
      console.error("❌ Error details:", {
        message: error.message,
        code: error.code,
        data: error.data
      });
      return null;
    }
  }

  /**
   * Create an escrow payment with USD pricing
   */
  async createEscrowPayment(
    request: EscrowPaymentRequest,
    priceUpdateData: string[] = []
  ): Promise<ethers.ContractTransaction> {
    if (!this.signer) throw new Error("Signer required for write operations");

    // Get update fee for price data
    const updateFee =
      priceUpdateData.length > 0
        ? await this.getPriceUpdateFee(priceUpdateData)
        : ethers.BigNumber.from(0);

    return await this.contract.createEscrowPayment(
      request.merchant,
      request.customer,
      ethers.utils.parseUnits(request.usdAmount, 8), // USD has 8 decimals
      request.sessionId,
      request.description,
      request.autoRelease || false,
      priceUpdateData,
      { value: updateFee }
    );
  }

  /**
   * Process a payment
   */
  async processPayment(paymentId: number): Promise<ethers.ContractTransaction> {
    if (!this.signer) throw new Error("Signer required for write operations");
    return await this.contract.processPayment(paymentId);
  }

  /**
   * Release escrowed payment
   */
  async releaseEscrowPayment(
    paymentId: number
  ): Promise<ethers.ContractTransaction> {
    if (!this.signer) throw new Error("Signer required for write operations");
    return await this.contract.releaseEscrowPayment(paymentId);
  }

  /**
   * Dispute escrowed payment
   */
  async disputeEscrowPayment(
    paymentId: number
  ): Promise<ethers.ContractTransaction> {
    if (!this.signer) throw new Error("Signer required for write operations");
    return await this.contract.disputeEscrowPayment(paymentId);
  }

  // ============ SUBSCRIPTION FUNCTIONS ============

  /**
   * Create a subscription
   */
  async createSubscription(
    request: SubscriptionRequest
  ): Promise<ethers.ContractTransaction> {
    if (!this.signer) throw new Error("Signer required for write operations");

    return await this.contract.createSubscription(
      request.merchant,
      ethers.utils.parseUnits(request.usdAmount, 8), // USD has 8 decimals
      request.interval,
      request.maxPayments || 0,
      request.description,
      request.autoRenew || false
    );
  }

  /**
   * Process subscription payment
   */
  async processSubscriptionPayment(
    subscriptionId: number,
    priceUpdateData: string[] = []
  ): Promise<ethers.ContractTransaction> {
    if (!this.signer) throw new Error("Signer required for write operations");

    const updateFee =
      priceUpdateData.length > 0
        ? await this.getPriceUpdateFee(priceUpdateData)
        : ethers.BigNumber.from(0);

    return await this.contract.processSubscriptionPayment(
      subscriptionId,
      priceUpdateData,
      { value: updateFee }
    );
  }

  // ============ BULK PAYMENT FUNCTIONS ============

  /**
   * Bulk pay single merchant (multiple payments to one recipient)
   */
  async bulkPaySingleMerchant(
    request: BulkPaymentToSingleRequest
  ): Promise<{ batchId: number; paymentIds: number[] } | null> {
    if (!this.signer) throw new Error("Signer required for write operations");

    const amounts = request.amounts.map((amount) =>
      ethers.utils.parseUnits(amount, 6)
    );

    const tx = await this.contract.bulkPaySingleMerchant(
      request.merchant,
      amounts,
      request.descriptions
    );

    const receipt = await tx.wait();
    const event = receipt.events?.find(
      (e: any) => e.event === "BulkBatchCreated"
    );

    if (event) {
      return {
        batchId: event.args.batchId.toNumber(),
        paymentIds: [], // Would need to parse from events
      };
    }

    return null;
  }

  /**
   * Bulk pay multiple merchants (distribute payments to multiple recipients)
   */
  async bulkPayMultipleMerchants(
    requests: BulkPaymentRequest[]
  ): Promise<{ batchId: number; paymentIds: number[] } | null> {
    if (!this.signer) throw new Error("Signer required for write operations");

    const formattedRequests = requests.map((req) => ({
      merchant: req.merchant,
      amount: ethers.utils.parseUnits(req.amount, 6),
      description: req.description,
    }));

    const tx = await this.contract.bulkPayMultipleMerchants(formattedRequests);
    const receipt = await tx.wait();
    const event = receipt.events?.find(
      (e: any) => e.event === "BulkBatchCreated"
    );

    if (event) {
      return {
        batchId: event.args.batchId.toNumber(),
        paymentIds: [], // Would need to parse from events
      };
    }

    return null;
  }

  /**
   * Bulk create escrow payments
   */
  async bulkCreateEscrowPayments(
    request: BulkEscrowPaymentRequest,
    priceUpdateData: string[] = []
  ): Promise<{ batchId: number; paymentIds: number[] } | null> {
    if (!this.signer) throw new Error("Signer required for write operations");

    const updateFee =
      priceUpdateData.length > 0
        ? await this.getPriceUpdateFee(priceUpdateData)
        : ethers.BigNumber.from(0);

    const usdAmounts = request.usdAmounts.map((amount) =>
      ethers.utils.parseUnits(amount, 8)
    );

    const tx = await this.contract.bulkCreateEscrowPayments(
      request.merchants,
      request.customers,
      usdAmounts,
      request.descriptions,
      request.autoRelease || false,
      priceUpdateData,
      { value: updateFee }
    );

    const receipt = await tx.wait();
    const event = receipt.events?.find(
      (e: any) => e.event === "BulkBatchCreated"
    );

    if (event) {
      return {
        batchId: event.args.batchId.toNumber(),
        paymentIds: [], // Would need to parse from events
      };
    }

    return null;
  }

  /**
   * Process bulk escrow batch
   */
  async processBulkEscrowBatch(
    batchId: number
  ): Promise<ethers.ContractTransaction> {
    if (!this.signer) throw new Error("Signer required for write operations");
    return await this.contract.processBulkEscrowBatch(batchId);
  }

  /**
   * Get bulk batch details
   */
  async getBulkBatch(batchId: number): Promise<BulkBatchDetails | null> {
    try {
      const result = await this.contract.getBulkBatch(batchId);
      return {
        id: batchId,
        customer: result.customer,
        totalAmount: ethers.utils.formatUnits(result.totalAmount, 6),
        totalFees: ethers.utils.formatUnits(result.totalFees, 6),
        paymentCount: result.paymentCount.toNumber(),
        processed: result.processed,
        createdAt: Date.now(), // Contract doesn't return this in getBulkBatch
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Get bulk batch payment IDs
   */
  async getBulkBatchPayments(batchId: number): Promise<number[]> {
    try {
      const result = await this.contract.getBulkBatchPayments(batchId);
      return result.map((id: ethers.BigNumber) => id.toNumber());
    } catch (error) {
      return [];
    }
  }

  /**
   * Get customer's bulk batches
   */
  async getCustomerBulkBatches(customer: string): Promise<number[]> {
    // This would require iterating through the mapping or using events
    const filter = this.contract.filters.BulkBatchCreated(null, customer);
    const events = await this.contract.queryFilter(filter);
    return events
      .map((event) => event.args?.batchId.toNumber())
      .filter(Boolean);
  }

  // ============ AFFILIATE FUNCTIONS ============

  /**
   * Register as an affiliate
   */
  async registerAffiliate(
    name: string,
    preferredCode: string
  ): Promise<ethers.ContractTransaction> {
    if (!this.signer) throw new Error("Signer required for write operations");
    return await this.contract.registerAffiliate(name, preferredCode);
  }

  /**
   * Withdraw affiliate earnings
   */
  async withdrawAffiliateEarnings(): Promise<ethers.ContractTransaction> {
    if (!this.signer) throw new Error("Signer required for write operations");
    return await this.contract.withdrawAffiliateEarnings();
  }

  // ============ VIEW FUNCTIONS ============

  /**
   * Get payment details
   */
  async getPayment(paymentId: number): Promise<PaymentDetails | null> {
    try {
      const payment = await this.contract.getPayment(paymentId);

      return {
        id: paymentId,
        merchant: payment.merchant,
        customer: payment.customer,
        amount: ethers.utils.formatUnits(payment.amount, 6),
        sessionId: payment.sessionId,
        status: payment.status,
        paymentType: payment.paymentType,
        createdAt: payment.createdAt.toNumber(),
        expiresAt: payment.expiresAt.toNumber(),
      };
    } catch (error) {
      console.error("Error fetching payment:", error);
      return null;
    }
  }

  /**
   * Get subscription details
   */
  async getSubscription(subscriptionId: number): Promise<SubscriptionDetails> {
    const result = await this.contract.getSubscription(subscriptionId);
    return {
      id: subscriptionId,
      merchant: result.merchant,
      customer: result.customer,
      usdAmount: ethers.utils.formatUnits(result.usdAmount, 8),
      interval: result.interval.toNumber(),
      nextPayment: result.nextPayment.toNumber(),
      status: result.status,
    };
  }

  /**
   * Get affiliate details
   */
  async getAffiliate(wallet: string): Promise<AffiliateDetails | null> {
    const result = await this.contract.getAffiliate(wallet);

    if (result.id.toNumber() === 0) return null;

    return {
      id: result.id.toNumber(),
      name: result.name,
      referralCode: ethers.utils.parseBytes32String(result.referralCode),
      totalReferrals: result.totalReferrals.toNumber(),
      totalVolume: ethers.utils.formatUnits(result.totalVolume, 6),
      tier: result.tier.toNumber(),
    };
  }

  /**
   * Get merchant's payments
   */
  async getMerchantPayments(merchant: string): Promise<number[]> {
    // This would require adding a view function to the contract
    // For now, we'll use events to get payment IDs
    const filter = this.contract.filters.PaymentCreated(null, merchant);
    const events = await this.contract.queryFilter(filter);
    return events
      .map((event) => event.args?.paymentId.toNumber())
      .filter(Boolean);
  }

  /**
   * Get customer's payments
   */
  async getCustomerPayments(customer: string): Promise<number[]> {
    const filter = this.contract.filters.PaymentProcessed(null, customer);
    const events = await this.contract.queryFilter(filter);
    return events
      .map((event) => event.args?.paymentId.toNumber())
      .filter(Boolean);
  }

  /**
   * Get user's spin credits
   */
  async getSpinCredits(user: string): Promise<string> {
    try {
      const credits = await this.contract.spinCredits(user);
      return credits.toString();
    } catch (error) {
      console.error('Error getting spin credits:', error);
      return '0';
    }
  }

  /**
   * Get user's loyalty points
   */
  async getLoyaltyPoints(user: string): Promise<string> {
    try {
      const points = await this.contract.loyaltyPoints(user);
      return points.toString();
    } catch (error) {
      console.error('Error getting loyalty points:', error);
      return '0';
    }
  }

  /**
   * Get affiliate earnings
   */
  async getAffiliateEarnings(affiliate: string): Promise<string> {
    const earnings = await this.contract.affiliateEarnings(affiliate);
    return ethers.utils.formatUnits(earnings, 6);
  }

  /**
   * Get merchant earnings
   */
  async getMerchantEarnings(merchant: string): Promise<string> {
    const earnings = await this.contract.merchantEarnings(merchant);
    return ethers.utils.formatUnits(earnings, 6);
  }

  // ============ UTILITY FUNCTIONS ============

  /**
   * Get price update fee for Pyth
   */
  async getPriceUpdateFee(
    priceUpdateData: string[]
  ): Promise<ethers.BigNumber> {
    // This would require calling Pyth contract directly
    // For now, return a reasonable estimate
    return ethers.utils.parseEther("0.001"); // 0.001 ETH
  }

  /**
   * Generate session ID
   */
  static generateSessionId(): string {
    return `ps_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Format payment status
   */
  static formatPaymentStatus(status: number): string {
    const statuses = [
      "Created",
      "Paid",
      "Expired",
      "Refunded",
      "Cancelled",
      "Escrowed",
      "Disputed",
    ];
    return statuses[status] || "Unknown";
  }

  /**
   * Format payment type
   */
  static formatPaymentType(type: number): string {
    const types = ["Regular", "Escrow", "Subscription", "Bulk"];
    return types[type] || "Unknown";
  }

  /**
   * Format subscription status
   */
  static formatSubscriptionStatus(status: number): string {
    const statuses = ["Active", "Paused", "Cancelled", "Expired"];
    return statuses[status] || "Unknown";
  }

  /**
   * Format tier name
   */
  static formatTierName(tier: number): string {
    const tiers = ["", "Bronze", "Silver", "Gold", "Diamond"];
    return tiers[tier] || "Unknown";
  }

  /**
   * Check if payment is expired
   */
  static isPaymentExpired(expiresAt: number): boolean {
    return Date.now() / 1000 > expiresAt;
  }

  /**
   * Get time until expiry
   */
  static getTimeUntilExpiry(expiresAt: number): string {
    const now = Date.now() / 1000;
    const diff = expiresAt - now;

    if (diff <= 0) return "Expired";

    const minutes = Math.floor(diff / 60);
    const seconds = Math.floor(diff % 60);

    return `${minutes}m ${seconds}s`;
  }

  /**
   * Format bulk batch status
   */
  static formatBulkBatchStatus(processed: boolean): string {
    return processed ? "Processed" : "Pending";
  }

  /**
   * Calculate total bulk payment amount
   */
  static calculateBulkTotal(amounts: string[]): string {
    return amounts.reduce((total, amount) => {
      return (parseFloat(total) + parseFloat(amount)).toString();
    }, "0");
  }

  /**
   * Generate bulk session ID
   */
  static generateBulkSessionId(type: "single" | "multiple"): string {
    return `bulk_${type}_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;
  }
}
