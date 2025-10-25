"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { ethers } from "ethers";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  Gift
} from "lucide-react";
import { toast } from "sonner";
import { PyLinksCoreService, PaymentDetails, CONTRACTS } from "@/lib/contracts/pylinks-core";

const PYUSD_ABI = [
  "function transfer(address to, uint256 amount) returns (bool)",
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)"
];

export default function PyLinksPaymentPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { ready, authenticated, user, login, linkWallet } = usePrivy();
  
  const [pyLinksService, setPyLinksService] = useState<PyLinksCoreService | null>(null);
  const [loading, setLoading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<"idle" | "processing" | "success" | "error">("idle");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<string>("");
  const [pyusdBalance, setPyusdBalance] = useState<string>("0");
  const [pyusdAllowance, setPyusdAllowance] = useState<string>("0");

  // URL parameters
  const sessionId = searchParams.get("session");
  const amount = searchParams.get("amount");
  const description = searchParams.get("description");
  const merchantId = searchParams.get("merchantId");

  useEffect(() => {
    if (ready && user?.wallet?.address && window.ethereum) {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const service = new PyLinksCoreService(signer);
      setPyLinksService(service);
      loadPaymentData(service);
      loadUserBalances();
    }
  }, [ready, user, sessionId]);

  // Timer for payment expiry
  useEffect(() => {
    if (!paymentDetails) return;

    const timer = setInterval(() => {
      const remaining = PyLinksCoreService.getTimeUntilExpiry(paymentDetails.expiresAt);
      setTimeRemaining(remaining);
      
      if (remaining === "Expired") {
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [paymentDetails]);

  const loadPaymentData = async (service: PyLinksCoreService) => {
    if (!sessionId) return;

    try {
      // In a real implementation, you'd need to find the payment ID by session ID
      // For now, we'll use the session ID as a mock payment ID
      // This would require adding a mapping function to the contract or using events
      
      // Mock payment data based on URL parameters
      if (amount && description) {
        const mockPayment: PaymentDetails = {
          id: 1,
          merchant: merchantId || "0x742d35Cc6634C0532925a3b8D9C9C0532925a3b8",
          customer: "0x0000000000000000000000000000000000000000",
          amount: amount,
          sessionId: sessionId,
          status: 0, // Created
          paymentType: 0, // Regular
          createdAt: Math.floor(Date.now() / 1000),
          expiresAt: Math.floor(Date.now() / 1000) + 600, // 10 minutes
        };
        setPaymentDetails(mockPayment);
      }
    } catch (error) {
      console.error("Error loading payment data:", error);
      toast.error("Failed to load payment details");
    }
  };

  const loadUserBalances = async () => {
    if (!user?.wallet?.address || !window.ethereum) return;

    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const pyusdContract = new ethers.Contract(CONTRACTS.PYUSD, PYUSD_ABI, provider);
      
      const balance = await pyusdContract.balanceOf(user.wallet.address);
      const allowance = await pyusdContract.allowance(user.wallet.address, CONTRACTS.PYLINKS_CORE);
      
      setPyusdBalance(ethers.utils.formatUnits(balance, 6));
      setPyusdAllowance(ethers.utils.formatUnits(allowance, 6));
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

  const approvePayment = async () => {
    if (!user?.wallet?.address || !amount || !window.ethereum) return;

    try {
      setLoading(true);
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const pyusdContract = new ethers.Contract(CONTRACTS.PYUSD, PYUSD_ABI, signer);
      
      const amountWei = ethers.utils.parseUnits(amount, 6);
      
      toast.success("Approving PYUSD spending...");
      const approveTx = await pyusdContract.approve(CONTRACTS.PYLINKS_CORE, amountWei);
      await approveTx.wait();
      
      toast.success("Approval successful! You can now process the payment.");
      loadUserBalances();
    } catch (error: any) {
      console.error("Approval error:", error);
      toast.error(`Approval failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const processPayment = async () => {
    if (!pyLinksService || !paymentDetails || !user?.wallet?.address) return;

    try {
      setLoading(true);
      setPaymentStatus("processing");

      // Check allowance
      const requiredAmount = parseFloat(amount || "0");
      const currentAllowance = parseFloat(pyusdAllowance);
      
      if (currentAllowance < requiredAmount) {
        toast.error("Please approve PYUSD spending first");
        return;
      }

      // Process payment through PyLinksCore
      const tx = await pyLinksService.processPayment(paymentDetails.id);
      setTxHash(tx.hash);
      
      toast.success("Payment submitted! Waiting for confirmation...");
      
      const receipt = await tx.wait();
      setPaymentStatus("success");
      
      toast.success("Payment completed successfully!");
      
      // Add spin credits notification
      const spinCredits = Math.floor(requiredAmount);
      if (spinCredits > 0) {
        toast.success(`You earned ${spinCredits} spin credits!`);
      }

    } catch (error: any) {
      console.error("Payment failed:", error);
      setPaymentStatus("error");
      
      if (error.code === 4001) {
        toast.error("Transaction rejected by user");
      } else if (error.message.includes("insufficient")) {
        toast.error("Insufficient PYUSD balance");
      } else {
        toast.error(`Payment failed: ${error.message || "Unknown error"}`);
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

  if (!sessionId || !amount || !description) {
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
                ${amount} PYUSD
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {description}
              </p>
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span>Amount:</span>
                <span className="font-medium">${amount} PYUSD</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Platform Fee (0.1%):</span>
                <span className="font-medium">${(parseFloat(amount) * 0.001).toFixed(6)} PYUSD</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Total:</span>
                <span className="font-medium">${amount} PYUSD</span>
              </div>
              
              {timeRemaining && timeRemaining !== "Expired" && (
                <div className="flex justify-between text-sm">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Expires in:
                  </span>
                  <span className="font-medium text-orange-600">{timeRemaining}</span>
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
                  <a
                    href={`https://eth-sepolia.blockscout.com/tx/${txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-2 inline-flex items-center gap-1 text-blue-600 hover:underline"
                  >
                    View Transaction <ExternalLink className="h-3 w-3" />
                  </a>
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
            <Button
              onClick={handleWalletConnect}
              className="w-full"
              size="lg"
            >
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
                <div className="flex justify-between text-sm">
                  <span>Approved Amount:</span>
                  <span className="font-medium">${pyusdAllowance}</span>
                </div>
              </div>

              {/* Payment Actions */}
              {parseFloat(pyusdBalance) < parseFloat(amount) ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Insufficient PYUSD balance. You need ${amount} PYUSD to complete this payment.
                  </AlertDescription>
                </Alert>
              ) : parseFloat(pyusdAllowance) < parseFloat(amount) ? (
                <Button
                  onClick={approvePayment}
                  className="w-full"
                  size="lg"
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Shield className="mr-2 h-4 w-4" />
                  )}
                  Approve PYUSD Spending
                </Button>
              ) : (
                <Button
                  onClick={processPayment}
                  className="w-full"
                  size="lg"
                  disabled={loading || paymentStatus === "success" || timeRemaining === "Expired"}
                >
                  {loading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <DollarSign className="mr-2 h-4 w-4" />
                  )}
                  {timeRemaining === "Expired" ? "Payment Expired" : "Pay Now"}
                </Button>
              )}

              {/* Rewards Info */}
              <div className="p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-2 text-sm text-blue-800">
                  <Gift className="h-4 w-4" />
                  <span>
                    Earn {Math.floor(parseFloat(amount))} spin credits with this payment!
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
