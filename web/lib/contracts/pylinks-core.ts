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
export const SEPOLIA_RPC = "https://ethereum-sepolia-rpc.publicnode.com";

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
    request: PaymentRequest
  ): Promise<ethers.ContractTransaction> {
    if (!this.signer) throw new Error("Signer required for write operations");

    const splits = request.splits || [];
    const referralCode = request.referralCode
      ? ethers.utils.formatBytes32String(request.referralCode)
      : ethers.constants.HashZero;

    return await this.contract.createPayment(
      request.merchant,
      ethers.utils.parseUnits(request.amount, 6), // PYUSD has 6 decimals
      request.sessionId,
      request.description,
      referralCode,
      splits,
      request.isOneTime || true
    );
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
  async getPayment(paymentId: number): Promise<PaymentDetails> {
    const result = await this.contract.getPayment(paymentId);
    return {
      id: paymentId,
      merchant: result.merchant,
      customer: result.customer,
      amount: ethers.utils.formatUnits(result.amount, 6),
      sessionId: result.sessionId,
      status: result.status,
      paymentType: result.paymentType,
      createdAt: result.createdAt.toNumber(),
      expiresAt: result.expiresAt.toNumber(),
    };
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
   * Get user's spin credits
   */
  async getSpinCredits(user: string): Promise<string> {
    const credits = await this.contract.spinCredits(user);
    return credits.toString();
  }

  /**
   * Get user's loyalty points
   */
  async getLoyaltyPoints(user: string): Promise<string> {
    const points = await this.contract.loyaltyPoints(user);
    return points.toString();
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
    const types = ["Regular", "Escrow", "Subscription"];
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
}
