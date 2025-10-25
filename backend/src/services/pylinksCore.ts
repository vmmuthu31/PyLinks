import { ethers } from "ethers";

// Contract addresses on Sepolia
export const CONTRACTS = {
  PYLINKS_CORE: "0xF67dd85750183cf55B875B59ceB0604C506480B6",
  NFT_RECEIPT: "0xDa348E77743be4dfD087c8d9C79F808F782A0218",
  PYUSD: "0xCaC524BcA292aaade2DF8A05cC58F0a65B1B3bB9", // Sepolia PYUSD
  PYTH: "0xDd24F84d36BF92C65F92307595335bdFab5Bbd21", // Pyth Sepolia
} as const;

// RPC URL for Sepolia
export const SEPOLIA_RPC = "https://ethereum-sepolia-rpc.publicnode.com";

// Contract ABI based on actual deployed contract
const PyLinksCore = {
  "abi": [
    // Payment functions
    "function disputeEscrowPayment(uint256 paymentId) external",
    "function releaseEscrowPayment(uint256 paymentId) external", 
    "function getPayment(uint256 paymentId) external view returns (address merchant, address customer, uint256 amount, string sessionId, uint8 status, uint8 paymentType, uint256 createdAt, uint256 expiresAt, bool oneTime, uint256 splits)",
    
    // Public mappings (auto-generated getters)
    "function merchantEarnings(address merchant) external view returns (uint256)",
    "function affiliateEarnings(address affiliate) external view returns (uint256)",
    "function customerPayments(address customer, uint256 index) external view returns (uint256)",
    "function merchantPayments(address merchant, uint256 index) external view returns (uint256)",
    
    // Affiliate functions
    "function withdrawAffiliateEarnings() external",
    "function getAffiliate(address wallet) external view returns (uint256 id, string name, bytes32 referralCode, uint256 totalReferrals, uint256 totalVolume, uint8 tier)",
    
    // Bulk functions
    "function getBulkBatch(uint256 batchId) external view returns (address customer, uint256 totalAmount, uint256 totalFees, uint256 paymentCount, bool processed, uint256 createdAt)",
    "function getBulkBatchPayments(uint256 batchId) external view returns (uint256[] memory)",
    
    // Subscription functions
    "function getSubscription(uint256 subscriptionId) external view returns (address merchant, address customer, uint256 usdAmount, uint256 interval, uint256 nextPayment, uint8 status, uint256 maxPayments, uint256 paymentCount, bool autoRenew)"
  ]
};

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
          PyLinksCore.abi,
          signerOrProvider
        );
      } else {
        this.contract = new ethers.Contract(
          CONTRACTS.PYLINKS_CORE,
          PyLinksCore.abi,
          signerOrProvider
        );
      }
    } else {
      this.contract = new ethers.Contract(
        CONTRACTS.PYLINKS_CORE,
        PyLinksCore.abi,
        this.provider
      );
    }
  }

  /**
   * Get payment details by ID
   */
  async getPayment(paymentId: number): Promise<PaymentDetails | null> {
    try {
      const result = await this.contract.getPayment(paymentId);
      return {
        id: paymentId,
        merchant: result[0], // merchant
        customer: result[1], // customer
        amount: ethers.utils.formatUnits(result[2], 6), // amount - PYUSD has 6 decimals
        sessionId: result[3], // sessionId
        status: result[4], // status
        paymentType: result[5], // paymentType
        createdAt: result[6].toNumber(), // createdAt
        expiresAt: result[7].toNumber() // expiresAt
      };
    } catch (error) {
      console.error('Error getting payment:', error);
      return null;
    }
  }

  /**
   * Dispute an escrow payment
   */
  async disputeEscrowPayment(paymentId: number): Promise<ethers.ContractTransaction> {
    if (!this.signer) throw new Error("Signer required for write operations");
    return await this.contract.disputeEscrowPayment(paymentId);
  }

  /**
   * Release an escrow payment
   */
  async releaseEscrowPayment(paymentId: number): Promise<ethers.ContractTransaction> {
    if (!this.signer) throw new Error("Signer required for write operations");
    return await this.contract.releaseEscrowPayment(paymentId);
  }

  /**
   * Get merchant earnings (using public mapping)
   */
  async getMerchantEarnings(merchant: string): Promise<string> {
    try {
      const earnings = await this.contract.merchantEarnings(merchant);
      return ethers.utils.formatUnits(earnings, 6); // PYUSD has 6 decimals
    } catch (error) {
      console.error('Error getting merchant earnings:', error);
      return '0';
    }
  }

  /**
   * Get affiliate earnings (using public mapping)
   */
  async getAffiliateEarnings(affiliate: string): Promise<string> {
    try {
      const earnings = await this.contract.affiliateEarnings(affiliate);
      return ethers.utils.formatUnits(earnings, 6); // PYUSD has 6 decimals
    } catch (error) {
      console.error('Error getting affiliate earnings:', error);
      return '0';
    }
  }

  /**
   * Withdraw affiliate earnings
   */
  async withdrawAffiliateEarnings(): Promise<ethers.ContractTransaction> {
    if (!this.signer) throw new Error("Signer required for write operations");
    return await this.contract.withdrawAffiliateEarnings();
  }
}
