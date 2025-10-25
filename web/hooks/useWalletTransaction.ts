"use client";

import { useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { ethers } from "ethers";
import { toast } from "sonner";

interface TransactionRequest {
  to: string;
  data?: string;
  value?: string | number;
  gasLimit?: number;
}

interface TransactionResult {
  hash: string;
  receipt?: ethers.ContractReceipt;
}

interface UseWalletTransactionReturn {
  sendTransaction: (request: TransactionRequest) => Promise<TransactionResult>;
  loading: boolean;
  error: string | null;
}

export function useWalletTransaction(): UseWalletTransactionReturn {
  const { user } = usePrivy();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendTransaction = async (request: TransactionRequest): Promise<TransactionResult> => {
    if (!user?.wallet?.address) {
      throw new Error("Wallet not connected");
    }

    if (!window.ethereum) {
      throw new Error("No wallet provider found. Please install MetaMask or connect a wallet.");
    }

    try {
      setLoading(true);
      setError(null);

      // Get provider and signer from user's wallet
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();

      // Ensure we're connected to the right account
      const signerAddress = await signer.getAddress();
      if (signerAddress.toLowerCase() !== user.wallet.address.toLowerCase()) {
        throw new Error("Wallet address mismatch. Please switch to the correct account.");
      }

      // Prepare transaction
      const txRequest: ethers.providers.TransactionRequest = {
        to: request.to,
        data: request.data,
        value: request.value ? ethers.utils.parseEther(request.value.toString()) : undefined,
        gasLimit: request.gasLimit || 200000, // Default gas limit
      };

      // Send transaction using user's wallet
      const tx = await signer.sendTransaction(txRequest);
      
      toast.success("Transaction submitted! Waiting for confirmation...");
      
      // Wait for confirmation
      const receipt = await tx.wait();
      
      toast.success("Transaction confirmed!");

      return {
        hash: tx.hash,
        receipt
      };

    } catch (error: any) {
      setError(error.message);
      
      // Handle common errors
      if (error.code === 4001) {
        toast.error("Transaction rejected by user");
      } else if (error.message.includes("insufficient")) {
        toast.error("Insufficient balance for transaction");
      } else if (error.message.includes("gas")) {
        toast.error("Transaction failed due to gas issues");
      } else {
        toast.error(`Transaction failed: ${error.message}`);
      }
      
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    sendTransaction,
    loading,
    error
  };
}

// Specialized hooks for common transaction types

export function useTokenTransaction() {
  const { sendTransaction, loading, error } = useWalletTransaction();

  const sendTokens = async (
    tokenAddress: string,
    toAddress: string,
    amount: string,
    decimals: number = 18
  ): Promise<TransactionResult> => {
    const tokenABI = [
      "function transfer(address to, uint256 amount) returns (bool)"
    ];

    const amountWei = ethers.utils.parseUnits(amount, decimals);
    const data = new ethers.utils.Interface(tokenABI).encodeFunctionData(
      "transfer",
      [toAddress, amountWei]
    );

    return sendTransaction({
      to: tokenAddress,
      data,
      gasLimit: 100000
    });
  };

  const approveTokens = async (
    tokenAddress: string,
    spenderAddress: string,
    amount: string,
    decimals: number = 18
  ): Promise<TransactionResult> => {
    const tokenABI = [
      "function approve(address spender, uint256 amount) returns (bool)"
    ];

    const amountWei = ethers.utils.parseUnits(amount, decimals);
    const data = new ethers.utils.Interface(tokenABI).encodeFunctionData(
      "approve",
      [spenderAddress, amountWei]
    );

    return sendTransaction({
      to: tokenAddress,
      data,
      gasLimit: 80000
    });
  };

  return {
    sendTokens,
    approveTokens,
    sendTransaction,
    loading,
    error
  };
}

export function useContractTransaction() {
  const { sendTransaction, loading, error } = useWalletTransaction();

  const callContract = async (
    contractAddress: string,
    abi: string[],
    functionName: string,
    args: any[],
    options?: { value?: string; gasLimit?: number }
  ): Promise<TransactionResult> => {
    const contractInterface = new ethers.utils.Interface(abi);
    const data = contractInterface.encodeFunctionData(functionName, args);

    return sendTransaction({
      to: contractAddress,
      data,
      value: options?.value,
      gasLimit: options?.gasLimit || 150000
    });
  };

  return {
    callContract,
    sendTransaction,
    loading,
    error
  };
}

// Specialized hook for PyLinks merchant payments
export function usePyLinksPayment() {
  const { user } = usePrivy();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendPaymentWithApproval = async (
    recipientAddress: string,
    amount: string,
    description: string = "PyLinks Payment"
  ): Promise<{ approvalHash?: string; paymentHash: string; totalHash: string }> => {
    if (!user?.wallet?.address) {
      throw new Error("Wallet not connected");
    }

    if (!window.ethereum) {
      throw new Error("No wallet provider found. Please install MetaMask or connect a wallet.");
    }

    try {
      setLoading(true);
      setError(null);

      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();

      // PYUSD Contract
      const PYUSD_ADDRESS = "0xCaC524BcA292aaade2DF8A05cC58F0a65B1B3bB9"; // Sepolia PYUSD
      const PYUSD_ABI = [
        "function transfer(address to, uint256 amount) returns (bool)",
        "function balanceOf(address owner) view returns (uint256)",
        "function allowance(address owner, address spender) view returns (uint256)",
        "function approve(address spender, uint256 amount) returns (bool)"
      ];

      const pyusdContract = new ethers.Contract(PYUSD_ADDRESS, PYUSD_ABI, signer);
      const amountWei = ethers.utils.parseUnits(amount, 6); // PYUSD has 6 decimals

      // Check balance
      const balance = await pyusdContract.balanceOf(user.wallet.address);
      if (balance.lt(amountWei)) {
        throw new Error(`Insufficient PYUSD balance. Required: ${amount} PYUSD`);
      }

      toast.success("Initiating payment...");

      // Check current allowance
      const currentAllowance = await pyusdContract.allowance(user.wallet.address, recipientAddress);
      let approvalHash: string | undefined;

      // Step 1: Approve if needed
      if (currentAllowance.lt(amountWei)) {
        toast.success("Approving PYUSD spending...");
        
        const approveTx = await pyusdContract.approve(recipientAddress, amountWei, {
          gasLimit: 80000
        });
        
        toast.success("Approval submitted! Waiting for confirmation...");
        await approveTx.wait();
        approvalHash = approveTx.hash;
        
        toast.success("Approval confirmed! Processing payment...");
      }

      // Step 2: Send payment
      toast.success("Sending payment...");
      
      const paymentTx = await pyusdContract.transfer(recipientAddress, amountWei, {
        gasLimit: 100000
      });

      toast.success("Payment submitted! Waiting for confirmation...");
      const paymentReceipt = await paymentTx.wait();
      
      toast.success(`Payment completed successfully! Sent ${amount} PYUSD to merchant.`);

      // Return transaction hashes for merchant to view
      return {
        approvalHash,
        paymentHash: paymentTx.hash,
        totalHash: paymentTx.hash // Main transaction hash
      };

    } catch (error: any) {
      setError(error.message);
      
      // Handle common errors
      if (error.code === 4001) {
        toast.error("Transaction rejected by user");
      } else if (error.message.includes("insufficient")) {
        toast.error("Insufficient PYUSD balance");
      } else if (error.message.includes("gas")) {
        toast.error("Transaction failed due to gas issues");
      } else {
        toast.error(`Payment failed: ${error.message}`);
      }
      
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const sendDirectPayment = async (
    recipientAddress: string,
    amount: string,
    description: string = "Direct PYUSD Payment"
  ): Promise<TransactionResult> => {
    if (!user?.wallet?.address) {
      throw new Error("Wallet not connected");
    }

    if (!window.ethereum) {
      throw new Error("No wallet provider found. Please install MetaMask or connect a wallet.");
    }

    try {
      setLoading(true);
      setError(null);

      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();

      const PYUSD_ADDRESS = "0xCaC524BcA292aaade2DF8A05cC58F0a65B1B3bB9";
      const PYUSD_ABI = [
        "function transfer(address to, uint256 amount) returns (bool)",
        "function balanceOf(address owner) view returns (uint256)"
      ];

      const pyusdContract = new ethers.Contract(PYUSD_ADDRESS, PYUSD_ABI, signer);
      const amountWei = ethers.utils.parseUnits(amount, 6);

      // Check balance
      const balance = await pyusdContract.balanceOf(user.wallet.address);
      if (balance.lt(amountWei)) {
        throw new Error(`Insufficient PYUSD balance. Required: ${amount} PYUSD`);
      }

      toast.success("Sending payment...");

      const tx = await pyusdContract.transfer(recipientAddress, amountWei, {
        gasLimit: 100000
      });

      toast.success("Payment submitted! Waiting for confirmation...");
      const receipt = await tx.wait();
      
      toast.success(`Payment completed! Sent ${amount} PYUSD successfully.`);

      return {
        hash: tx.hash,
        receipt
      };

    } catch (error: any) {
      setError(error.message);
      
      if (error.code === 4001) {
        toast.error("Transaction rejected by user");
      } else if (error.message.includes("insufficient")) {
        toast.error("Insufficient PYUSD balance");
      } else {
        toast.error(`Payment failed: ${error.message}`);
      }
      
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    sendPaymentWithApproval,
    sendDirectPayment,
    loading,
    error
  };
}
