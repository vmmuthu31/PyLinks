"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
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
  User,
  Clock
} from "lucide-react";
import { ethers } from "ethers";
import axios from "axios";
import { toast } from "sonner";

const PYUSD_ADDRESS = "0xCaC524BcA292aaade2DF8A05cC58F0a65B1B3bB9"; // Sepolia PYUSD
const PYUSD_ABI = [
  "function transfer(address to, uint256 amount) returns (bool)",
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)"
];

interface Merchant {
  _id: string;
  name: string;
  email: string;
  walletAddress: string;
  apiKey: string;
}

export default function PaymentPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { ready, authenticated, user, login, linkWallet } = usePrivy();
  
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [loading, setLoading] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<"idle" | "processing" | "success" | "error">("idle");

  const merchantId = searchParams.get("merchantId");
  const amount = searchParams.get("amount");
  const memo = searchParams.get("memo");

  // Fetch merchant details
  useEffect(() => {
    if (!merchantId) return;
    
    const fetchMerchant = async () => {
      try {
        const response = await axios.get(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/merchants/${merchantId}`
        );
        setMerchant(response.data.data);
      } catch (error) {
        console.error("Error fetching merchant:", error);
        toast.error("Invalid merchant or payment link");
      }
    };
    
    fetchMerchant();
  }, [merchantId]);

  const handleWalletConnect = async () => {
    if (!ready) return;
    
    try {
      if (!authenticated) {
        // Redirect to auth page with payment parameters
        const currentUrl = new URL(window.location.href);
        const authUrl = `/?merchantId=${merchantId}&amount=${amount}&memo=${memo || ''}`;
        router.push(authUrl);
      } else if (!user?.wallet) {
        await linkWallet();
      }
    } catch (error) {
      console.error("Wallet connection error:", error);
      toast.error("Failed to connect wallet");
    }
  };

  const handlePayment = async () => {
    if (!merchant?.walletAddress || !amount || !user?.wallet?.address) {
      toast.error("Missing payment information");
      return;
    }

    try {
      setLoading(true);
      setPaymentStatus("processing");

      // Get provider from window.ethereum (MetaMask or injected wallet)
      if (!window.ethereum) {
        throw new Error("No wallet provider found. Please install MetaMask.");
      }
      
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      
      // Create contract instance
      const pyusdContract = new ethers.Contract(PYUSD_ADDRESS, PYUSD_ABI, signer);
      
      // Check balance first
      const balance = await pyusdContract.balanceOf(user.wallet.address);
      const requiredAmount = ethers.utils.parseUnits(amount.toString(), 6); // PYUSD has 6 decimals
      
      if (balance.lt(requiredAmount)) {
        throw new Error("Insufficient PYUSD balance");
      }

      // Send transaction
      const tx = await pyusdContract.transfer(merchant.walletAddress, requiredAmount, {
        gasLimit: 100000,
      });

      toast.success("Transaction submitted! Waiting for confirmation...");
      
      // Wait for confirmation
      const receipt = await tx.wait();
      setTxHash(tx.hash);
      setPaymentStatus("success");

      // Record payment on backend
      try {
        await axios.post(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/payments/record`,
          {
            merchantId,
            txHash: tx.hash,
            amount: Number(amount),
            userWallet: user.wallet.address,
            memo,
            blockNumber: receipt.blockNumber,
          }
        );
      } catch (recordError) {
        console.error("Failed to record payment:", recordError);
        // Payment succeeded on-chain, so don't fail the whole process
      }

      toast.success("Payment completed successfully!");
      
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

  if (!merchant) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 px-4">
        <Alert className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Loading merchant information...
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold flex items-center justify-center gap-2">
            <DollarSign className="h-6 w-6 text-green-600" />
            Pay with PYUSD
          </CardTitle>
          <CardDescription>
            Secure payment powered by PyLinks
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Merchant Info */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-gray-600" />
              <span className="font-medium text-gray-900">
                {merchant.name}
              </span>
            </div>
            <Separator />
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Amount:</span>
              <span className="text-2xl font-bold text-green-600">
                ${amount} USD
              </span>
            </div>
            {memo && (
              <div className="flex justify-between items-start">
                <span className="text-gray-600">Description:</span>
                <span className="text-sm text-gray-900 text-right max-w-48">
                  {memo}
                </span>
              </div>
            )}
          </div>

          {/* Payment Status */}
          {paymentStatus === "success" && txHash && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                <div className="space-y-2">
                  <p className="font-medium">Payment Successful!</p>
                  <p className="text-sm">Transaction Hash:</p>
                  <div className="flex items-center gap-2">
                    <code className="text-xs bg-white px-2 py-1 rounded border">
                      {txHash.slice(0, 10)}...{txHash.slice(-8)}
                    </code>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.open(`https://sepolia.etherscan.io/tx/${txHash}`, '_blank')}
                    >
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {paymentStatus === "error" && (
            <Alert className="border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                Payment failed. Please try again or contact support.
              </AlertDescription>
            </Alert>
          )}

          {/* Wallet Connection & Payment */}
          <div className="space-y-4">
            {!authenticated ? (
              <Button
                onClick={handleWalletConnect}
                className="w-full"
                size="lg"
              >
                <Wallet className="mr-2 h-4 w-4" />
                Login to Pay
              </Button>
            ) : !user?.wallet ? (
              <Button
                onClick={handleWalletConnect}
                className="w-full"
                size="lg"
              >
                <Wallet className="mr-2 h-4 w-4" />
                Link Wallet
              </Button>
            ) : paymentStatus === "success" ? (
              <div className="text-center space-y-2">
                <Badge variant="default" className="bg-green-100 text-green-800">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Payment Complete
                </Badge>
                <p className="text-sm text-gray-600">
                  Thank you for your payment!
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Connected Wallet:</span>
                  <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                    {user.wallet.address.slice(0, 6)}...{user.wallet.address.slice(-4)}
                  </code>
                </div>
                
                <Button
                  onClick={handlePayment}
                  disabled={loading || paymentStatus === "processing"}
                  className="w-full bg-green-600 hover:bg-green-700"
                  size="lg"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing Payment...
                    </>
                  ) : (
                    <>
                      <DollarSign className="mr-2 h-4 w-4" />
                      Pay ${amount} PYUSD
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>

          {/* Payment Info */}
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
              <Clock className="h-3 w-3" />
              <span>Payments are processed on Ethereum Sepolia</span>
            </div>
            <p className="text-xs text-gray-500">
              Powered by PyLinks • Secure PYUSD Payments
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
