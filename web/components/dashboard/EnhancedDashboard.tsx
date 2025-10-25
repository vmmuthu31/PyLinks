"use client";

import { useEffect, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { ethers } from "ethers";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { QrCode, Copy, DollarSign, TrendingUp, Loader2, Check, Wallet, Gift } from "lucide-react";
import QRCode from "react-qr-code";
import { toast } from "sonner";
import { PyLinksCoreService, PaymentRequest, PaymentDetails } from "@/lib/contracts/pylinks-core";

interface DashboardStats {
  totalPayments: number;
  totalVolume: string;
  totalFees: string;
  activePayments: number;
}

export default function EnhancedDashboard() {
  const { user, ready } = usePrivy();
  const [pyLinksService, setPyLinksService] = useState<PyLinksCoreService | null>(null);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<DashboardStats>({
    totalPayments: 0,
    totalVolume: "0",
    totalFees: "0",
    activePayments: 0,
  });

  // Payment creation form
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [paymentType, setPaymentType] = useState<"regular" | "escrow">("regular");
  const [qrUrl, setQrUrl] = useState("");
  const [currentPayment, setCurrentPayment] = useState<PaymentDetails | null>(null);

  // Recent payments
  const [recentPayments, setRecentPayments] = useState<PaymentDetails[]>([]);

  // Affiliate info
  const [affiliateInfo, setAffiliateInfo] = useState<any>(null);
  const [spinCredits, setSpinCredits] = useState("0");
  const [loyaltyPoints, setLoyaltyPoints] = useState("0");

  useEffect(() => {
    if (ready && user?.wallet?.address && window.ethereum) {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const service = new PyLinksCoreService(signer);
      setPyLinksService(service);
      loadDashboardData(service);
    }
  }, [ready, user]);

  const loadDashboardData = async (service: PyLinksCoreService) => {
    if (!user?.wallet?.address) return;

    try {
      setLoading(true);

      // Load affiliate info
      const affiliate = await service.getAffiliate(user.wallet.address);
      setAffiliateInfo(affiliate);

      // Load gamification data
      const credits = await service.getSpinCredits(user.wallet.address);
      const points = await service.getLoyaltyPoints(user.wallet.address);
      setSpinCredits(credits);
      setLoyaltyPoints(points);

      // Load merchant earnings
      const earnings = await service.getMerchantEarnings(user.wallet.address);
      
      // Load real payment data from contract events
      const paymentIds = await service.getMerchantPayments(user.wallet.address);
      const recentPaymentDetails = await Promise.all(
        paymentIds.slice(0, 10).map(id => service.getPayment(id))
      );
      setRecentPayments(recentPaymentDetails.filter(Boolean));
      
      // Calculate real stats
      const totalVolume = parseFloat(earnings);
      const platformFee = totalVolume * 0.001; // 0.1% fee
      const activePayments = recentPaymentDetails.filter(
        p => p && p.status === 0 && Date.now() / 1000 < p.expiresAt
      ).length;
      
      setStats({
        totalPayments: paymentIds.length,
        totalVolume: earnings,
        totalFees: platformFee.toFixed(6),
        activePayments: activePayments,
      });

    } catch (error) {
      console.error("Error loading dashboard data:", error);
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const createPayment = async () => {
    if (!pyLinksService || !user?.wallet?.address || !amount || !description) {
      toast.error("Please fill in all fields");
      return;
    }

    try {
      setLoading(true);

      const sessionId = PyLinksCoreService.generateSessionId();
      
      const paymentRequest: PaymentRequest = {
        merchant: user.wallet.address,
        amount: amount,
        sessionId: sessionId,
        description: description,
        isOneTime: true,
      };

      const tx = await pyLinksService.createPayment(paymentRequest);
      toast.success("Payment created! Waiting for confirmation...");

      const receipt = await tx.wait();
      toast.success("Payment created successfully!");

      // Generate QR code URL
      const paymentUrl = `${window.location.origin}/pay?session=${sessionId}&amount=${amount}&description=${encodeURIComponent(description)}`;
      setQrUrl(paymentUrl);

      // Reset form
      setAmount("");
      setDescription("");

      // Reload data
      loadDashboardData(pyLinksService);

    } catch (error: any) {
      console.error("Error creating payment:", error);
      toast.error(`Failed to create payment: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const registerAffiliate = async () => {
    if (!pyLinksService || !user?.wallet?.address) return;

    try {
      setLoading(true);
      const name = prompt("Enter your affiliate name:");
      const code = prompt("Enter preferred referral code:");
      
      if (!name || !code) return;

      const tx = await pyLinksService.registerAffiliate(name, code);
      toast.success("Registering affiliate... Please wait for confirmation");

      await tx.wait();
      toast.success("Successfully registered as affiliate!");

      loadDashboardData(pyLinksService);
    } catch (error: any) {
      console.error("Error registering affiliate:", error);
      toast.error(`Failed to register: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!ready || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">PyLinks Dashboard</h1>
          <p className="text-muted-foreground">Unified payment processing with PyLinksCore</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="flex items-center gap-1">
            <Wallet className="h-3 w-3" />
            {user.wallet?.address?.slice(0, 6)}...{user.wallet?.address?.slice(-4)}
          </Badge>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Payments</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalPayments}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Volume</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.totalVolume}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Spin Credits</CardTitle>
            <Gift className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{spinCredits}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Loyalty Points</CardTitle>
            <Gift className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loyaltyPoints}</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Payment Creation */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <QrCode className="h-5 w-5" />
                Create Payment
              </CardTitle>
              <CardDescription>
                Generate payment links with 10-minute expiry and 0.1% fees
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="regular" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="regular">Regular Payment</TabsTrigger>
                  <TabsTrigger value="escrow">Escrow Payment</TabsTrigger>
                </TabsList>

                <TabsContent value="regular" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="amount">Amount (PYUSD)</Label>
                      <Input
                        id="amount"
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="25.00"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Input
                        id="description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Payment for service"
                      />
                    </div>
                  </div>

                  <Button
                    onClick={createPayment}
                    className="w-full"
                    disabled={loading || !amount || !description}
                  >
                    {loading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <QrCode className="mr-2 h-4 w-4" />
                    )}
                    Create Payment
                  </Button>

                  {qrUrl && (
                    <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                      <div className="flex flex-col items-center space-y-4">
                        <div className="bg-white p-4 rounded-lg shadow-sm">
                          <QRCode value={qrUrl} size={200} />
                        </div>
                        <div className="text-center space-y-2">
                          <p className="text-sm font-medium">
                            Payment: ${amount} PYUSD
                          </p>
                          <p className="text-sm text-gray-600">{description}</p>
                          <div className="flex items-center gap-2 mt-3">
                            <Input
                              value={qrUrl}
                              readOnly
                              className="text-xs font-mono"
                            />
                            <Button
                              size="sm"
                              onClick={() => {
                                navigator.clipboard.writeText(qrUrl);
                                toast.success("Payment URL copied!");
                              }}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="escrow" className="space-y-4 mt-4">
                  <Alert>
                    <AlertDescription>
                      Escrow payments use Pyth oracles for dynamic USD pricing and provide buyer protection with dispute resolution.
                    </AlertDescription>
                  </Alert>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="usd-amount">Amount (USD)</Label>
                      <Input
                        id="usd-amount"
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="25.00"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="escrow-description">Description</Label>
                      <Input
                        id="escrow-description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Escrow payment for service"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="customer-address">Customer Address</Label>
                    <Input
                      id="customer-address"
                      placeholder="0x742d35Cc6634C0532925a3b8D9C9C0532925a3b8"
                    />
                  </div>
                  
                  <Button
                    onClick={() => toast.info("Escrow payment creation coming soon!")}
                    className="w-full"
                    disabled={loading || !amount || !description}
                  >
                    {loading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <QrCode className="mr-2 h-4 w-4" />
                    )}
                    Create Escrow Payment
                  </Button>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* Affiliate Panel */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Affiliate Program</CardTitle>
              <CardDescription>
                Earn rewards by referring customers
              </CardDescription>
            </CardHeader>
            <CardContent>
              {affiliateInfo ? (
                <div className="space-y-3">
                  <div>
                    <Label className="text-sm font-medium">Name</Label>
                    <p className="text-sm">{affiliateInfo.name}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Referral Code</Label>
                    <p className="text-sm font-mono">{affiliateInfo.referralCode}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Tier</Label>
                    <Badge variant="outline">
                      {PyLinksCoreService.formatTierName(affiliateInfo.tier)}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <Label>Referrals</Label>
                      <p className="font-medium">{affiliateInfo.totalReferrals}</p>
                    </div>
                    <div>
                      <Label>Volume</Label>
                      <p className="font-medium">${affiliateInfo.totalVolume}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Join our affiliate program to earn 20% of platform fees from your referrals.
                  </p>
                  <Button
                    onClick={registerAffiliate}
                    className="w-full"
                    disabled={loading}
                  >
                    {loading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    Register as Affiliate
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
