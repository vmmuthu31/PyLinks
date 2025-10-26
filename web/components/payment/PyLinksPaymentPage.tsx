"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { usePrivy, useSendTransaction } from "@privy-io/react-auth";
import { ethers } from "ethers";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  Wallet,
  CheckCircle,
  AlertCircle,
  Loader2,
  ExternalLink,
  DollarSign,
  Clock,
  Shield,
  Gift,
} from "lucide-react";
import { toast } from "sonner";
import {
  PyLinksCoreService,
  PaymentDetails,
  CONTRACTS,
} from "@/lib/contracts/pylinks-core";
import { openTransaction } from "@/lib/utils/blockscout";

const PYUSD_ABI = [
  "function transfer(address to, uint256 amount) returns (bool)",
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
];

export default function PyLinksPaymentPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { ready, authenticated, user, login, linkWallet, logout } = usePrivy();
  const { sendTransaction } = useSendTransaction();

  const [loading, setLoading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<
    "idle" | "processing" | "success" | "error"
  >("idle");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails | null>(
    null
  );
  const [timeRemaining, setTimeRemaining] = useState<string>("");
  const [pyusdBalance, setPyusdBalance] = useState<string>("0");
  const [sessionLoading, setSessionLoading] = useState(true);
  const [walletConnected, setWalletConnected] = useState(false);

  // URL parameters - for contract-based payments, we expect paymentId
  const paymentId =
    searchParams.get("paymentId") ||
    searchParams.get("session") ||
    searchParams.get("request");

  useEffect(() => {
    if (ready && paymentId) {
      // For request_ sessions, logout Privy to use MetaMask directly
      if (paymentId.startsWith("request_") && authenticated) {
        console.log(
          "🚪 Logging out Privy for request session - will use MetaMask directly"
        );
        logout();
        return;
      }
      initializePayment();
    }
  }, [ready, paymentId, authenticated, logout]);

  // Check wallet connection for request sessions
  useEffect(() => {
    const checkConnection = async () => {
      if (paymentId?.startsWith("request_")) {
        const connected = await checkWalletConnection();
        setWalletConnected(connected);
      }
    };
    
    if (paymentId && !sessionLoading) {
      checkConnection();
    }
  }, [paymentId, sessionLoading]);

  const initializePayment = async () => {
    try {
      setSessionLoading(true);

      if (!paymentId) {
        throw new Error("No payment ID provided");
      }

      console.log("Payment ID:", paymentId);
      // Initialize read-only provider for contract data
      const provider = new ethers.providers.JsonRpcProvider(
        process.env.NEXT_PUBLIC_RPC_URL ||
          "https://ethereum-sepolia-rpc.publicnode.com"
      );
      const service = new PyLinksCoreService(provider);

      // Load payment - try as session ID first, then as numeric ID
      let payment: PaymentDetails | null = null;

      // Check if it looks like a session ID string
      if (
        paymentId.startsWith("payment_") ||
        paymentId.startsWith("request_") ||
        paymentId.startsWith("ps_") ||
        paymentId.includes("-")
      ) {
        payment = await service.getPaymentBySessionId(paymentId);
      } else {
        // Try as numeric payment ID
        const numericId = parseInt(paymentId);
        if (!isNaN(numericId)) {
          payment = await service.getPayment(numericId);
        }
      }

      console.log("Payment:", payment);
      if (!payment) {
        toast.error("Payment not found");
        return;
      }

      setPaymentDetails(payment);

      // Load user balances if wallet connected
      if (user?.wallet?.address) {
        await loadUserBalances();
      }
    } catch (error) {
      console.error("Error initializing payment:", error);
      toast.error(`Failed to load payment: ${error}`);
    } finally {
      setSessionLoading(false);
    }
  };

  // Timer for payment expiry
  useEffect(() => {
    if (!paymentDetails) return;

    const timer = setInterval(() => {
      const remaining = PyLinksCoreService.getTimeUntilExpiry(
        paymentDetails.expiresAt
      );
      setTimeRemaining(remaining);

      if (remaining === "Expired") {
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [paymentDetails]);

  const loadUserBalances = async () => {
    if (!user?.wallet?.address) return;

    try {
      const provider = new ethers.providers.JsonRpcProvider(
        process.env.NEXT_PUBLIC_RPC_URL ||
          "https://ethereum-sepolia-rpc.publicnode.com"
      );
      const pyusdContract = new ethers.Contract(
        CONTRACTS.PYUSD,
        PYUSD_ABI,
        provider
      );

      const balance = await pyusdContract.balanceOf(user.wallet.address);

      setPyusdBalance(ethers.utils.formatUnits(balance, 6));
    } catch (error) {
      console.error("Error loading balances:", error);
    }
  };
  // Check if wallet is connected (for request sessions)
  const checkWalletConnection = async () => {
    if (!window.ethereum) return false;
    
    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      await signer.getAddress();
      return true;
    } catch (error) {
      return false;
    }
  };

  const connectWallet = async () => {
    try {
      if (!window.ethereum) {
        toast.error("Please install MetaMask or another Web3 wallet");
        return false;
      }

      // Request account access
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      
      // Verify connection
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const address = await signer.getAddress();
      
      setWalletConnected(true);
      toast.success(`Wallet connected: ${address.slice(0, 6)}...${address.slice(-4)}`);
      return true;
    } catch (error: any) {
      console.error("Wallet connection failed:", error);
      setWalletConnected(false);
      if (error.code === 4001) {
        toast.error("Wallet connection rejected by user");
      } else {
        toast.error("Failed to connect wallet. Please try again.");
      }
      return false;
    }
  };

  const processPayment = async () => {
    const isRequestSession = paymentId?.startsWith("request_") || false;

    if (isRequestSession) {
      // For request sessions, check MetaMask connection
      if (!window.ethereum) {
        toast.error("Please install MetaMask or another Web3 wallet");
        return;
      }

      // Check if wallet is connected
      try {
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const signer = provider.getSigner();
        await signer.getAddress(); // This will throw if not connected
      } catch (error: any) {
        if (error.code === "UNSUPPORTED_OPERATION") {
          toast.error("Please connect your wallet first");
          const connected = await connectWallet();
          if (!connected) return;
        } else {
          toast.error("Wallet connection issue. Please reconnect your wallet.");
          return;
        }
      }

      if (!paymentDetails) {
        toast.error("Payment details missing");
        return;
      }
    } else {
      // For payment sessions, check Privy connection
      if (!user?.wallet?.address || !paymentDetails) {
        toast.error("Wallet not connected or payment details missing");
        return;
      }
    }

    // Validate wallet connection
    if (!window.ethereum) {
      toast.error(
        "No wallet provider found. Please install MetaMask or connect a wallet."
      );
      return;
    }

    try {
      setLoading(true);
      setPaymentStatus("processing");

      const requiredAmount = parseFloat(paymentDetails.amount);

      toast.success("Sending PYUSD payment...");

      const PYUSD_ADDRESS = "0xCaC524BcA292aaade2DF8A05cC58F0a65B1B3bB9";
      const amountWei = ethers.utils.parseUnits(paymentDetails.amount, 6); // PYUSD has 6 decimals

      // Determine payment method based on session ID prefix
      const isRequestSession = paymentId?.startsWith("request_") || false;

      let result;

      if (isRequestSession) {
        // Use browser Web3 provider for request_ sessions (allows wallet popup)
        console.log("Using Web3 provider for request session:", paymentId);

        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const signer = provider.getSigner();

        // Create contract instances
        const pyusdContract = new ethers.Contract(
          PYUSD_ADDRESS,
          [
            "function approve(address spender, uint256 amount) returns (bool)",
            "function allowance(address owner, address spender) view returns (uint256)",
          ],
          signer
        );

        const pyLinksContract = new ethers.Contract(
          CONTRACTS.PYLINKS_CORE,
          ["function processPayment(uint256 paymentId)"],
          signer
        );

        // Get MetaMask address
        const metaMaskAddress = await signer.getAddress();

        // Check current allowance using actual MetaMask address
        const currentAllowance = await pyusdContract.allowance(
          metaMaskAddress,
          CONTRACTS.PYLINKS_CORE
        );

        // Single transaction flow with smart approval
        if (currentAllowance.lt(amountWei)) {
          // Need approval - show user it's a 2-step process
          toast.success("Step 1/2: Approving PYUSD spending...");
          const approveTx = await pyusdContract.approve(
            CONTRACTS.PYLINKS_CORE,
            ethers.constants.MaxUint256 // Approve max amount to avoid future approvals
          );
          await approveTx.wait();
          toast.success("Step 2/2: Processing payment...");
        } else {
          toast.success("Processing payment...");
        }

        // Debug payment details before processing
        console.log("🔍 Payment Debug Info:");
        console.log("- Payment ID:", paymentDetails.id);
        console.log("- Payment Status:", paymentDetails.status);
        console.log("- Payment Amount:", paymentDetails.amount);
        console.log("- Current Customer:", paymentDetails.customer);
        console.log("- Merchant Address:", paymentDetails.merchant);
        console.log("- Paying Address (MetaMask):", metaMaskAddress);
        console.log("- Expires At:", new Date(paymentDetails.expiresAt * 1000));
        console.log("- Current Time:", new Date());
        console.log(
          "- Is Expired:",
          Date.now() / 1000 > paymentDetails.expiresAt
        );

        // Check if payment is expired
        if (Date.now() / 1000 > paymentDetails.expiresAt) {
          toast.error("❌ Payment has expired and can no longer be processed");
          setPaymentStatus("error");
          return;
        }

        // Note: In production, typically different customers pay merchant requests
        // For testing purposes, we'll allow self-payment
        if (
          paymentDetails.merchant.toLowerCase() ===
          metaMaskAddress.toLowerCase()
        ) {
          console.log(
            "⚠️ Warning: Merchant is paying their own payment request (testing scenario)"
          );
        }

        // Get actual MetaMask address
        const actualSigner = await signer.getAddress();
        console.log("- Actual MetaMask Address:", actualSigner);

        // For request sessions, we only use MetaMask address
        console.log(
          "✅ Using MetaMask address for request session:",
          actualSigner
        );

        // Check PYUSD allowance using actual MetaMask address
        const allowance = await pyusdContract.allowance(
          metaMaskAddress,
          CONTRACTS.PYLINKS_CORE
        );
        console.log(
          "- PYUSD Allowance:",
          ethers.utils.formatUnits(allowance, 6)
        );
        console.log("- Required Amount:", paymentDetails.amount);
        console.log("- Sufficient Allowance:", allowance.gte(amountWei));

        // Process payment
        console.log("🚀 Attempting to process payment...");
        const tx = await pyLinksContract.processPayment(paymentDetails.id);
        const receipt = await tx.wait();
        result = { hash: tx.hash };
      } else {
        // Use Privy sendTransaction for payment_ sessions (no popup)
        console.log(
          "Using Privy sendTransaction for payment session:",
          paymentId
        );

        // Check allowance first using read-only provider
        const readProvider = new ethers.providers.JsonRpcProvider(
          process.env.NEXT_PUBLIC_RPC_URL ||
            "https://ethereum-sepolia-rpc.publicnode.com"
        );
        const pyusdReadContract = new ethers.Contract(
          PYUSD_ADDRESS,
          [
            "function allowance(address owner, address spender) view returns (uint256)",
          ],
          readProvider
        );

        const currentAllowance = await pyusdReadContract.allowance(
          user?.wallet?.address || "",
          CONTRACTS.PYLINKS_CORE
        );

        // Smart approval - only approve if needed
        if (currentAllowance.lt(amountWei)) {
          toast.success("Step 1/2: Approving PYUSD spending...");
          const approveData = new ethers.utils.Interface([
            "function approve(address spender, uint256 amount) returns (bool)",
          ]).encodeFunctionData("approve", [
            CONTRACTS.PYLINKS_CORE,
            ethers.constants.MaxUint256, // Max approval to avoid future approvals
          ]);

          await sendTransaction(
            {
              to: PYUSD_ADDRESS,
              data: approveData,
            },
            {
              uiOptions: {
                showWalletUIs: false,
              },
            }
          );
          toast.success("Step 2/2: Processing payment...");
        } else {
          toast.success("Processing payment...");
        }

        // Process payment
        const processData = new ethers.utils.Interface([
          "function processPayment(uint256 paymentId)",
        ]).encodeFunctionData("processPayment", [paymentDetails.id]);

        result = await sendTransaction(
          {
            to: CONTRACTS.PYLINKS_CORE,
            data: processData,
          },
          {
            uiOptions: {
              showWalletUIs: false,
            },
          }
        );
      }

      setTxHash(result.hash);
      setPaymentStatus("success");

      toast.success("Payment completed successfully!");

      // Add spin credits notification
      const spinCredits = Math.floor(requiredAmount);
      if (spinCredits > 0) {
        toast.success(`🎉 You earned ${spinCredits} spin credits!`);
      }
    } catch (error: any) {
      console.error("❌ Payment failed:", error);
      console.error("❌ Error details:", {
        message: error.message,
        code: error.code,
        data: error.data,
        reason: error.reason,
      });

      setPaymentStatus("error");

      // Decode specific contract errors
      let errorMessage = "Payment failed";

      if (error.data === "0x13be252b") {
        errorMessage =
          "Payment not available - you may be trying to pay your own payment or it's already processed";
      } else if (error.data === "0x2d0a346e") {
        errorMessage = "Payment expired";
      } else if (error.data === "0x664b28b0") {
        errorMessage = "Payment has expired and can no longer be processed";
      } else if (error.data === "0x8f4eb604") {
        errorMessage = "Payment not found";
      } else if (error.data === "0x90b8ec18") {
        errorMessage = "Transfer failed (insufficient balance or allowance)";
      } else if (error.message?.includes("insufficient")) {
        errorMessage = "Insufficient PYUSD balance";
      } else if (error.message?.includes("allowance")) {
        errorMessage = "Insufficient PYUSD allowance";
      } else if (error.code === "UNPREDICTABLE_GAS_LIMIT") {
        errorMessage =
          "Transaction will fail - check payment status and balances";
      }

      toast.error(errorMessage);

      // Enhanced error handling
      if (error.code === 4001) {
        toast.error("Transaction rejected by user");
      } else if (error.code === "UNSUPPORTED_OPERATION") {
        toast.error("Wallet connection issue. Please reconnect your wallet.");
      } else if (error.code === "UNPREDICTABLE_GAS_LIMIT") {
        toast.error(
          "Transaction may fail due to gas estimation issues. Please try again."
        );
      } else if (error.message.includes("insufficient")) {
        toast.error("Insufficient balance for payment");
      } else if (error.message.includes("user rejected")) {
        toast.error("Transaction was rejected");
      } else {
        toast.error(
          `Payment failed: ${error.message || "Unknown error occurred"}`
        );
      }
    } finally {
      setLoading(false);
    }
  };

  if (!ready) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (sessionLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!paymentId || !paymentDetails) {
    return (
      <div className="container mx-auto p-6 max-w-md">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Invalid payment link. Please check the URL and try again.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const isExpired = Date.now() / 1000 > paymentDetails.expiresAt;

  return (
    <div className="container mx-auto mt-20 p-6 max-w-md">
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            <img
              src="/logo.png"
              alt="PyLinks Logo"
              className="h-6 w-6 rounded-full"
            />
            PyLinks Payment
          </CardTitle>
          <CardDescription>
            Secure PYUSD payment with PyLinksCore
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Payment Details */}
          <div className="space-y-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">
                ${paymentDetails.amount} PYUSD
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Payment ID: {paymentDetails.id}
              </p>
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span>Amount:</span>
                <span className="font-medium">
                  ${paymentDetails.amount} PYUSD
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Platform Fee (0.1%):</span>
                <span className="font-medium">
                  ${(parseFloat(paymentDetails.amount) * 0.001).toFixed(6)}{" "}
                  PYUSD
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Total:</span>
                <span className="font-medium">
                  ${paymentDetails.amount} PYUSD
                </span>
              </div>

              {timeRemaining && (
                <div className="flex justify-between text-sm">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {timeRemaining === "Expired" ? "Status:" : "Expires in:"}
                  </span>
                  <span
                    className={`font-medium ${
                      timeRemaining === "Expired"
                        ? "text-red-600"
                        : "text-orange-600"
                    }`}
                  >
                    {timeRemaining}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Payment Status */}
          {paymentStatus === "success" && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Payment completed successfully!
                {txHash && (
                  <button
                    onClick={() => openTransaction(txHash)}
                    className="ml-2 inline-flex items-center gap-1 text-blue-600 hover:underline"
                  >
                    View Transaction <ExternalLink className="h-3 w-3" />
                  </button>
                )}
              </AlertDescription>
            </Alert>
          )}

          {paymentId?.startsWith("request_") && !walletConnected ? (
            <div className="space-y-3">
              <Alert className="border-blue-200 bg-blue-50">
                <Wallet className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800">
                  Connect your Web3 wallet (MetaMask, etc.) to complete this payment.
                </AlertDescription>
              </Alert>
              <Button
                onClick={connectWallet}
                className="w-full"
                size="lg"
                variant="outline"
              >
                <Wallet className="mr-2 h-4 w-4" />
                Connect Wallet to Pay
              </Button>
            </div>
          ) : (
            <Button
              onClick={processPayment}
              className="w-full"
              size="lg"
              disabled={paymentStatus === "success" || isExpired}
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <DollarSign className="mr-2 h-4 w-4" />
              )}
              {isExpired ? "Payment Expired" : `Pay $${paymentDetails.amount} PYUSD`}
              {paymentId?.startsWith("request_") && " (via Wallet)"}
            </Button>
          )}

          {/* Rewards Info */}
          <div className="p-3 bg-blue-50 rounded-lg">
            <div className="flex items-center gap-2 text-sm text-blue-800">
              <Gift className="h-4 w-4" />
              <span>
                Earn {Math.floor(parseFloat(paymentDetails.amount))} spin
                credits with this payment!
              </span>
            </div>
          </div>

          {/* Security Info */}
          <div className="text-center text-xs text-muted-foreground">
            <p>Secured by PyLinksCore smart contract</p>
            <p>Verified on Ethereum Sepolia</p>
            {paymentId?.startsWith("request_") ? (
              <p className="text-blue-600 mt-1">Payment via Web3 Provider</p>
            ) : (
              <p className="text-green-600 mt-1">Seamless Payment via Privy</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
