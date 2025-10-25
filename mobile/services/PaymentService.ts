import { WalletService } from "./WalletService";
import { ApiService, PaymentSession } from "./ApiService";
import { ethers } from "ethers";

export interface PaymentResult {
  success: boolean;
  txHash?: string;
  error?: string;
}

export class PaymentService {
  /**
   * Process a payment session
   */
  static async processPayment(sessionId: string): Promise<PaymentResult> {
    try {
      // 1. Get payment session details
      const session = await ApiService.getPaymentSession(sessionId);

      if (session.status !== "pending") {
        return {
          success: false,
          error: `Payment is ${session.status}`,
        };
      }

      // Check if expired
      if (new Date(session.expiresAt) < new Date()) {
        return {
          success: false,
          error: "Payment session has expired",
        };
      }

      // 2. Send PYUSD payment
      const tx = await WalletService.sendPyusd(
        session.recipientAddress,
        session.amount.toString()
      );

      // 3. Wait for transaction confirmation
      const receipt = await tx.wait();

      if (receipt.status === 1) {
        // 4. Verify on backend
        await ApiService.verifyPayment(sessionId);

        return {
          success: true,
          txHash: receipt.transactionHash,
        };
      } else {
        return {
          success: false,
          error: "Transaction failed",
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Payment processing failed",
      };
    }
  }

  /**
   * Send direct PYUSD payment (without session)
   */
  static async sendDirectPayment(
    recipientAddress: string,
    amount: string,
    memo?: string
  ): Promise<PaymentResult> {
    try {
      // Validate address
      if (!ethers.utils.isAddress(recipientAddress)) {
        return {
          success: false,
          error: "Invalid recipient address",
        };
      }

      // Send payment
      const tx = await WalletService.sendPyusd(recipientAddress, amount);

      // Wait for confirmation
      const receipt = await tx.wait();

      if (receipt.status === 1) {
        return {
          success: true,
          txHash: receipt.transactionHash,
        };
      } else {
        return {
          success: false,
          error: "Transaction failed",
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Payment failed",
      };
    }
  }

  /**
   * Check payment status
   */
  static async checkPaymentStatus(sessionId: string): Promise<PaymentSession> {
    return await ApiService.getPaymentSession(sessionId);
  }

  /**
   * Estimate gas for payment
   */
  static async estimateGas(
    recipientAddress: string,
    amount: string
  ): Promise<{ gasLimit: string; estimatedCost: string }> {
    const wallet = WalletService.getWallet();
    if (!wallet) {
      throw new Error("Wallet not loaded");
    }

    // PYUSD contract ABI (minimal)
    const pyusdAbi = [
      "function transfer(address to, uint256 amount) returns (bool)",
      "function decimals() view returns (uint8)",
    ];

    const contract = new ethers.Contract(
      wallet.provider.network.chainId === 11155111
        ? "0xCaC524BcA292aaade2DF8A05cC58F0a65B1B3bB9" // Sepolia PYUSD
        : "0x0000000000000000000000000000000000000000",
      pyusdAbi,
      wallet
    );

    const decimals = await contract.decimals();
    const amountInWei = ethers.utils.parseUnits(amount, decimals);

    const gasLimit = await contract.estimateGas.transfer(
      recipientAddress,
      amountInWei
    );

    const gasPrice = await wallet.provider.getGasPrice();
    const estimatedCost = gasLimit.mul(gasPrice);

    return {
      gasLimit: gasLimit.toString(),
      estimatedCost: ethers.utils.formatEther(estimatedCost),
    };
  }

  /**
   * Get transaction details
   */
  static async getTransactionDetails(txHash: string): Promise<{
    status: "pending" | "success" | "failed";
    blockNumber?: number;
    from?: string;
    to?: string;
    value?: string;
    gasUsed?: string;
  }> {
    const provider = WalletService.initProvider();
    const tx = await provider.getTransaction(txHash);

    if (!tx) {
      throw new Error("Transaction not found");
    }

    const receipt = await provider.getTransactionReceipt(txHash);

    return {
      status: !receipt
        ? "pending"
        : receipt.status === 1
        ? "success"
        : "failed",
      blockNumber: receipt?.blockNumber,
      from: tx.from,
      to: tx.to || undefined,
      value: ethers.utils.formatEther(tx.value),
      gasUsed: receipt?.gasUsed.toString(),
    };
  }
}
