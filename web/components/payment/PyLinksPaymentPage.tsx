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
  const { ready, authenticated, user, login, linkWallet } = usePrivy();
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

  // URL parameters - for contract-based payments, we expect paymentId
  const paymentId =
    searchParams.get("paymentId") || searchParams.get("session");

  useEffect(() => {
    if (ready && paymentId) {
      initializePayment();
    }
  }, [ready, paymentId]);

  const initializePayment = async () => {
    try {
      setSessionLoading(true);

      if (!paymentId) {
        throw new Error("No payment ID provided");
      }

      // Initialize read-only provider for contract data
      const provider = new ethers.providers.JsonRpcProvider(
        "https://ethereum-sepolia-rpc.publicnode.com"
      );
      const service = new PyLinksCoreService(provider);

      // Load payment - try as session ID first, then as numeric ID
      let payment: PaymentDetails | null = null;

      // Check if it looks like a session ID string
      if (
        paymentId.startsWith("payment_") ||
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

  const handleWalletConnect = async () => {
    if (!ready) return;

    try {
      if (!authenticated) {
        await login();
      } else if (!user?.wallet) {
        await linkWallet();
      }
    } catch (error) {
      console.error("Wallet connection error:", error);
      toast.error("Failed to connect wallet");
    }
  };

  const processPayment = async () => {
    if (!user?.wallet?.address || !paymentDetails) return;

    try {
      setLoading(true);
      setPaymentStatus("processing");

      // Check PYUSD balance
      const requiredAmount = parseFloat(paymentDetails.amount);
      const currentBalance = parseFloat(pyusdBalance);

      if (currentBalance < requiredAmount) {
        toast.error("Insufficient PYUSD balance");
        return;
      }

      toast.success("Sending PYUSD payment...");

      // PYUSD transfer using Privy sendTransaction
      const PYUSD_ADDRESS = "0xCaC524BcA292aaade2DF8A05cC58F0a65B1B3bB9";
      const amountWei = ethers.utils.parseUnits(paymentDetails.amount, 6); // PYUSD has 6 decimals
      
      const transferData = new ethers.utils.Interface([
        "function transfer(address to, uint256 amount) returns (bool)"
      ]).encodeFunctionData("transfer", [paymentDetails.merchant, amountWei]);
      
      const result = await sendTransaction({
        to: PYUSD_ADDRESS,
        data: transferData
      }, {
        uiOptions: {
          showWalletUIs: false // No popup modals
        }
      });

      setTxHash(result.hash);
      setPaymentStatus("success");

      toast.success("Payment completed successfully!");

      // Add spin credits notification
      const spinCredits = Math.floor(requiredAmount);
      if (spinCredits > 0) {
        toast.success(`🎉 You earned ${spinCredits} spin credits!`);
      }
    } catch (error: any) {
      console.error("Payment failed:", error);
      setPaymentStatus("error");

      if (error.code === 4001) {
        toast.error("Transaction rejected by user");
      } else if (error.message.includes("insufficient")) {
        toast.error("Insufficient balance for payment");
      } else {
        toast.error(`Payment failed: ${error.message}`);
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

  return (
    <div className="container mx-auto p-6 max-w-md">
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            <DollarSign className="h-6 w-6" />
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

              {timeRemaining && timeRemaining !== "Expired" && (
                <div className="flex justify-between text-sm">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Expires in:
                  </span>
                  <span className="font-medium text-orange-600">
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

          {paymentStatus === "error" && (
            <Alert className="border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                Payment failed. Please try again.
              </AlertDescription>
            </Alert>
          )}

          {/* Wallet Connection */}
          {!authenticated || !user?.wallet ? (
            <Button onClick={handleWalletConnect} className="w-full" size="lg">
              <Wallet className="mr-2 h-4 w-4" />
              Connect Wallet to Pay
            </Button>
          ) : (
            <div className="space-y-4">
              {/* User Balance */}
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="flex justify-between text-sm">
                  <span>Your PYUSD Balance:</span>
                  <span className="font-medium">${pyusdBalance}</span>
                </div>
              </div>

              {/* Payment Actions */}
              {parseFloat(pyusdBalance) < parseFloat(paymentDetails.amount) ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Insufficient PYUSD balance. You need $
                    {paymentDetails.amount} PYUSD to complete this payment.
                  </AlertDescription>
                </Alert>
              ) : (
                <Button
                  onClick={processPayment}
                  className="w-full"
                  size="lg"
                  disabled={paymentStatus === "success"}
                >
                  {loading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <DollarSign className="mr-2 h-4 w-4" />
                  )}
                  Pay ${paymentDetails.amount} PYUSD
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
            </div>
          )}

          {/* Security Info */}
          <div className="text-center text-xs text-muted-foreground">
            <p>Secured by PyLinksCore smart contract</p>
            <p>Verified on Ethereum Sepolia</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
