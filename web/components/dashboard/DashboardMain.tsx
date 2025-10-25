"use client";

import { useEffect, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import { ethers } from "ethers";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Wallet,
  RefreshCw,
  LogOut,
  QrCode,
  Copy,
  CheckCircle,
  AlertCircle,
  DollarSign,
  CreditCard,
  TrendingUp,
  Loader2,
  Check,
} from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import { clearUser } from "@/lib/store/slices/authSlice";
import {
  updateMerchant,
  clearMerchant,
} from "@/lib/store/slices/merchantSlice";
import { addPayment } from "@/lib/store/slices/paymentSlice";
import axios from "axios";
import QRCode from "react-qr-code";
import { toast } from "sonner";

export default function DashboardMain() {
  const { logout, user, linkWallet, unlinkWallet, createWallet } = usePrivy();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { merchant } = useAppSelector((state) => state.merchant);
  const { payments } = useAppSelector((state) => state.payment);

  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [balances, setBalances] = useState({ eth: "0", pyusd: "0" });
  const [loadingBalances, setLoadingBalances] = useState(false);
  const [copiedStates, setCopiedStates] = useState<{ [key: string]: boolean }>(
    {}
  );

  useEffect(() => {
    const storedMerchant = localStorage.getItem("merchant");
    if (storedMerchant && !merchant) {
      dispatch(updateMerchant(JSON.parse(storedMerchant)));
    }
  }, [merchant, dispatch]);

  // Fetch wallet balances when wallet is connected
  useEffect(() => {
    if (merchant?.walletAddress) {
      fetchWalletBalances();
    }
  }, [merchant?.walletAddress]);

  const fetchWalletBalances = async () => {
    if (!merchant?.walletAddress) return;

    try {
      setLoadingBalances(true);

      // Connect to Sepolia testnet
      const provider = new ethers.providers.JsonRpcProvider(
        "https://ethereum-sepolia-rpc.publicnode.com"
      );

      // Get ETH balance
      const ethBalance = await provider.getBalance(merchant.walletAddress);
      const ethFormatted = ethers.utils.formatEther(ethBalance);

      // PYUSD contract on Sepolia
      const PYUSD_ADDRESS = "0xCaC524BcA292aaade2DF8A05cC58F0a65B1B3bB9";
      const PYUSD_ABI = [
        "function balanceOf(address owner) view returns (uint256)",
        "function decimals() view returns (uint8)",
      ];

      const pyusdContract = new ethers.Contract(
        PYUSD_ADDRESS,
        PYUSD_ABI,
        provider
      );
      const pyusdBalance = await pyusdContract.balanceOf(
        merchant.walletAddress
      );
      const pyusdFormatted = ethers.utils.formatUnits(pyusdBalance, 6); // PYUSD has 6 decimals

      setBalances({
        eth: parseFloat(ethFormatted).toFixed(4),
        pyusd: parseFloat(pyusdFormatted).toFixed(2),
      });
    } catch (error) {
      console.error("Error fetching balances:", error);
      toast.error("Failed to fetch wallet balances");
    } finally {
      setLoadingBalances(false);
    }
  };

  const handleWalletConnect = async () => {
    try {
      setConnecting(true);
      await linkWallet();

      if (user?.wallet?.address && merchant?.apiKey) {
        // Update wallet address on backend
        const response = await axios.put(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/merchants/update-wallet`,
          { walletAddress: user.wallet.address },
          {
            headers: {
              "x-api-key": merchant.apiKey,
              "Content-Type": "application/json",
            },
          }
        );

        if (response.data?.success) {
          const updatedMerchant = {
            ...merchant,
            walletAddress: user.wallet.address,
          };
          dispatch(updateMerchant(updatedMerchant));
          localStorage.setItem("merchant", JSON.stringify(updatedMerchant));
          toast.success("Wallet connected successfully!");
        }
      }
    } catch (error: any) {
      console.error("Wallet connection error:", error);
      toast.error("Failed to connect wallet");
    } finally {
      setConnecting(false);
    }
  };

  const handleCreateWallet = async () => {
    try {
      setConnecting(true);
      await createWallet();
      toast.success("Wallet created successfully!");
    } catch (error) {
      console.error("Wallet creation error:", error);
      toast.error("Failed to create wallet");
    } finally {
      setConnecting(false);
    }
  };

  const regenerateApiKey = async () => {
    if (!merchant) return;

    try {
      setLoading(true);
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/merchants/regenerate-keys`,
        {},
        { headers: { "x-api-key": merchant.apiKey } }
      );

      const updatedMerchant = { ...merchant, ...response.data.data };
      dispatch(updateMerchant(updatedMerchant));
      localStorage.setItem("merchant", JSON.stringify(updatedMerchant));
      toast.success("API key regenerated successfully!");
    } catch (error) {
      console.error("API key regeneration error:", error);
      toast.error("Failed to regenerate API key");
    } finally {
      setLoading(false);
    }
  };

  const generatePaymentQR = async () => {
    if (!amount || isNaN(Number(amount))) {
      toast.error("Please enter a valid amount");
      return;
    }

    try {
      const merchantId = merchant?.merchantId || merchant?._id;
      if (!merchantId) {
        toast.error("Merchant ID not found");
        return;
      }

      const payUrl = `${
        window.location.origin
      }/pay?merchantId=${merchantId}&amount=${amount}&memo=${encodeURIComponent(
        memo || ""
      )}`;
      setQrUrl(payUrl);

      // Add to payments list
      const newPayment = {
        sessionId: `session_${Date.now()}`,
        merchantId: merchantId,
        amount: Number(amount),
        currency: "USD",
        description: memo || `Payment of $${amount}`,
        status: "pending" as const,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 3600000).toISOString(), // 1 hour
      };

      dispatch(addPayment(newPayment));
      toast.success("Payment QR generated successfully!");
    } catch (error) {
      console.error("QR generation error:", error);
      toast.error("Failed to generate QR code");
    }
  };

  const copyToClipboard = async (text: string, label: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);

      // Show tick animation
      setCopiedStates((prev) => ({ ...prev, [key]: true }));

      // Enhanced toast with better styling
      toast.success(`${label} copied to clipboard!`, {
        duration: 2000,
        style: {
          background: "#10B981",
          color: "white",
          border: "none",
        },
      });

      // Reset tick after 2 seconds
      setTimeout(() => {
        setCopiedStates((prev) => ({ ...prev, [key]: false }));
      }, 2000);
    } catch (error) {
      toast.error(`Failed to copy ${label}`, {
        style: {
          background: "#EF4444",
          color: "white",
          border: "none",
        },
      });
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      dispatch(clearUser());
      dispatch(clearMerchant());
      localStorage.clear();
      router.push("/");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  if (!merchant) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
        <Alert className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No merchant session found. Please login again.
          </AlertDescription>
        </Alert>
        <Button onClick={() => router.push("/")} className="mt-4">
          Go Back to Login
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Merchant Dashboard
              </h1>
              <p className="text-gray-600">Manage your PYUSD payments</p>
            </div>
            <Button
              onClick={handleLogout}
              variant="outline"
              className="flex items-center gap-2"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Merchant Info & Wallet */}
          <div className="lg:col-span-1 space-y-6">
            {/* Merchant Info Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Merchant Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm font-medium text-gray-700">
                    Name
                  </Label>
                  <p className="text-sm text-gray-900">{merchant.name}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">
                    Email
                  </Label>
                  <p className="text-sm text-gray-900">{merchant.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-sm font-medium text-gray-700">
                    Wallet Status
                  </Label>
                  <div className="flex items-center gap-2">
                    {merchant.walletAddress ? (
                      <Badge
                        variant="default"
                        className="bg-green-100 text-green-800"
                      >
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Connected
                      </Badge>
                    ) : (
                      <Badge
                        variant="secondary"
                        className="bg-red-100 text-red-800"
                      >
                        <AlertCircle className="h-3 w-3 mr-1" />
                        Not Connected
                      </Badge>
                    )}
                  </div>
                  {merchant.walletAddress && (
                    <p className="text-xs text-gray-500 font-mono">
                      {merchant.walletAddress.slice(0, 6)}...
                      {merchant.walletAddress.slice(-4)}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Wallet Information Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wallet className="h-5 w-5" />
                  Wallet Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {merchant.walletAddress ? (
                  <div className="space-y-3">
                    <div>
                      <Label className="text-sm font-medium text-gray-700">
                        Wallet Address
                      </Label>
                      <div className="flex items-center gap-1 mt-1">
                        <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono flex-1">
                          {merchant.walletAddress}
                        </code>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            merchant.walletAddress &&
                            copyToClipboard(
                              merchant.walletAddress,
                              "Wallet Address",
                              "walletAddress"
                            )
                          }
                          className="h-7 w-7 p-0"
                        >
                          {copiedStates.walletAddress ? (
                            <Check className="h-3 w-3 text-green-600" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                    </div>

                    <div>
                      <Label className="text-sm font-medium text-gray-700">
                        Network
                      </Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          Ethereum Sepolia
                        </Badge>
                      </div>
                    </div>

                    <div>
                      <Label className="text-sm font-medium text-gray-700">
                        Balances
                      </Label>
                      {loadingBalances ? (
                        <div className="flex items-center gap-2 mt-1">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          <span className="text-sm text-gray-600">
                            Loading balances...
                          </span>
                        </div>
                      ) : (
                        <div className="space-y-2 mt-1">
                          <div className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                              <span className="text-sm font-medium">ETH</span>
                            </div>
                            <span className="text-sm font-mono">
                              {balances.eth}
                            </span>
                          </div>
                          <div className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                              <span className="text-sm font-medium">PYUSD</span>
                            </div>
                            <span className="text-sm font-mono">
                              {balances.pyusd}
                            </span>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={fetchWalletBalances}
                            className="w-full mt-2"
                            disabled={loadingBalances}
                          >
                            <RefreshCw className="h-3 w-3 mr-2" />
                            Refresh Balances
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <Wallet className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <div className="text-sm text-gray-600 mb-3">
                      No wallet connected
                    </div>
                    <Button
                      onClick={handleCreateWallet}
                      disabled={connecting}
                      variant="outline"
                      size="sm"
                      className="w-full"
                    >
                      {connecting ? (
                        <>
                          <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        <>
                          <Wallet className="mr-2 h-3 w-3" />
                          Create Wallet
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* API Key Card */}
            <Card>
              <CardHeader>
                <CardTitle>API Key</CardTitle>
                <CardDescription>
                  Use this key to integrate PyLinks into your applications
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative">
                  <Input
                    value={merchant.apiKey || ""}
                    readOnly
                    className="font-mono text-xs pr-10"
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    className="absolute right-1 top-1 h-8 w-8 p-0"
                    onClick={() =>
                      copyToClipboard(merchant.apiKey, "API Key", "apiKey")
                    }
                  >
                    {copiedStates.apiKey ? (
                      <Check className="h-3 w-3 text-green-600" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </Button>
                </div>
                <Button
                  onClick={regenerateApiKey}
                  disabled={loading}
                  variant="outline"
                  className="w-full"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Regenerating...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Regenerate Key
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Payment Generation */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <QrCode className="h-5 w-5" />
                  Generate Payment QR
                </CardTitle>
                <CardDescription>
                  Create a payment link and QR code for your customers
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="create" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="create">Create Payment</TabsTrigger>
                    <TabsTrigger value="history">Payment History</TabsTrigger>
                  </TabsList>

                  <TabsContent value="create" className="space-y-6 mt-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="amount">Amount (USD)</Label>
                        <Input
                          id="amount"
                          type="number"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          placeholder="Enter amount (e.g. 25.00)"
                          className="text-lg"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="memo">Description (Optional)</Label>
                        <Input
                          id="memo"
                          value={memo}
                          onChange={(e) => setMemo(e.target.value)}
                          placeholder="Payment description"
                        />
                      </div>
                    </div>

                    <Button
                      onClick={generatePaymentQR}
                      className="w-full"
                      size="lg"
                    >
                      <QrCode className="mr-2 h-4 w-4" />
                      Generate Payment QR
                    </Button>

                    {qrUrl && (
                      <div className="mt-6 p-6 bg-gray-50 rounded-lg">
                        <div className="flex flex-col items-center space-y-4">
                          <div className="bg-white p-4 rounded-lg shadow-sm">
                            <QRCode value={qrUrl} size={200} />
                          </div>
                          <div className="text-center space-y-2">
                            <p className="text-sm font-medium text-gray-900">
                              Payment Amount: ${amount} USD
                            </p>
                            {memo && (
                              <p className="text-sm text-gray-600">
                                Description: {memo}
                              </p>
                            )}
                            <div className="flex items-center gap-2 mt-3">
                              <Input
                                value={qrUrl}
                                readOnly
                                className="text-xs font-mono"
                              />
                              <Button
                                size="sm"
                                onClick={() =>
                                  copyToClipboard(qrUrl, "Payment URL", "qrUrl")
                                }
                              >
                                {copiedStates.qrUrl ? (
                                  <Check className="h-3 w-3 text-green-600" />
                                ) : (
                                  <Copy className="h-3 w-3" />
                                )}
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="history" className="mt-6">
                    <div className="space-y-4">
                      {payments.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          <DollarSign className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                          <p>No payments generated yet</p>
                          <p className="text-sm">
                            Create your first payment to see it here
                          </p>
                        </div>
                      ) : (
                        payments.slice(0, 10).map((payment) => (
                          <Card key={payment.sessionId} className="p-4">
                            <div className="flex justify-between items-center">
                              <div>
                                <p className="font-medium">
                                  ${payment.amount} USD
                                </p>
                                <p className="text-sm text-gray-600">
                                  {payment.description}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {new Date(payment.createdAt).toLocaleString()}
                                </p>
                              </div>
                              <Badge
                                variant={
                                  payment.status === "paid"
                                    ? "default"
                                    : payment.status === "pending"
                                    ? "secondary"
                                    : "destructive"
                                }
                              >
                                {payment.status}
                              </Badge>
                            </div>
                          </Card>
                        ))
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
