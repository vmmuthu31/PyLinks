"use client";

import { useState, useEffect } from "react";
import { usePrivy } from "@privy-io/react-auth";
import {
  Wallet,
  Send,
  Eye,
  EyeOff,
  Copy,
  ExternalLink,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Clock,
  CheckCircle,
  Receipt,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { usePyLinksCore } from "@/hooks/usePyLinksCore";

export default function WalletOverview() {
  const { user } = usePrivy();
  const router = useRouter();
  const {
    getMerchantEarnings,
    getCustomerPayments,
    getSpinCredits,
    getLoyaltyPoints,
  } = usePyLinksCore();
  const [showBalance, setShowBalance] = useState(true);
  const [balance, setBalance] = useState("0.000000");
  const [earnings, setEarnings] = useState("0.000000");
  const [totalPayments, setTotalPayments] = useState(0);
  const [spinCredits, setSpinCredits] = useState("0");
  const [loyaltyPoints, setLoyaltyPoints] = useState("0");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWalletData();
  }, [user?.wallet?.address]);

  const loadWalletData = async () => {
    if (!user?.wallet?.address) return;

    try {
      setLoading(true);

      // Load merchant earnings
      const merchantEarnings = await getMerchantEarnings(user.wallet.address);
      setEarnings(parseFloat(merchantEarnings).toFixed(6));

      // Load customer payments count
      const customerPayments = await getCustomerPayments(user.wallet.address);
      setTotalPayments(customerPayments.length);

      // Load gamification data
      const credits = await getSpinCredits(user.wallet.address);
      const points = await getLoyaltyPoints(user.wallet.address);
      setSpinCredits(credits);
      setLoyaltyPoints(points);

      // Mock balance for now (would need to query PYUSD contract)
      setBalance("125.450000");
    } catch (error) {
      console.error("Error loading wallet data:", error);
      toast.error("Failed to load wallet data");
    } finally {
      setLoading(false);
    }
  };

  const copyWalletAddress = () => {
    if (user?.wallet?.address) {
      navigator.clipboard.writeText(user.wallet.address);
      toast.success("Wallet address copied to clipboard!");
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const toggleBalanceVisibility = () => {
    setShowBalance(!showBalance);
  };

  const formatBalance = (amount: string) => {
    return showBalance ? `${parseFloat(amount).toFixed(6)} PYUSD` : "••••••••";
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Wallet Overview</h2>
          <p className="text-muted-foreground">
            Manage your PYUSD wallet and transactions
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => router.push("/dashboard/wallet/send")}
            size="sm"
          >
            <Send className="h-4 w-4 mr-2" />
            Send
          </Button>
          <Button
            onClick={() => router.push("/dashboard/wallet/receive")}
            variant="outline"
            size="sm"
          >
            <Receipt className="h-4 w-4 mr-2" />
            Receive
          </Button>
        </div>
      </div>

      {/* Wallet Address Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Wallet Address
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                <Wallet className="h-4 w-4 text-primary-foreground" />
              </div>
              <div>
                <p className="font-mono text-sm">{user?.wallet?.address}</p>
                <p className="text-xs text-muted-foreground">
                  {formatAddress(user?.wallet?.address || "")}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={copyWalletAddress} variant="ghost" size="sm">
                <Copy className="h-4 w-4" />
              </Button>
              <Button
                onClick={() =>
                  window.open(
                    `https://etherscan.io/address/${user?.wallet?.address}`,
                    "_blank"
                  )
                }
                variant="ghost"
                size="sm"
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Balance and Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">
                  PYUSD Balance
                </p>
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-bold">{formatBalance(balance)}</p>
                  <Button
                    onClick={toggleBalanceVisibility}
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                  >
                    {showBalance ? (
                      <EyeOff className="h-3 w-3" />
                    ) : (
                      <Eye className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">
                  Total Earnings
                </p>
                <p className="text-2xl font-bold">{formatBalance(earnings)}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">
                  Total Payments
                </p>
                <p className="text-2xl font-bold">{totalPayments}</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">
                  Spin Credits
                </p>
                <p className="text-2xl font-bold">{spinCredits}</p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common wallet operations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button
              onClick={() => router.push("/dashboard/wallet/send")}
              variant="outline"
              className="h-20 flex-col gap-2"
            >
              <Send className="h-6 w-6" />
              Send Money
            </Button>
            <Button
              onClick={() => router.push("/dashboard/wallet/receive")}
              variant="outline"
              className="h-20 flex-col gap-2"
            >
              <Receipt className="h-6 w-6" />
              Receive Money
            </Button>
            <Button
              onClick={() => router.push("/dashboard/bulk/single")}
              variant="outline"
              className="h-20 flex-col gap-2"
            >
              <Send className="h-6 w-6" />
              Bulk Send
            </Button>
            <Button
              onClick={() => router.push("/dashboard/wallet/history")}
              variant="outline"
              className="h-20 flex-col gap-2"
            >
              <Clock className="h-6 w-6" />
              History
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Gamification Stats */}
      <Card>
        <CardHeader>
          <CardTitle>Rewards & Loyalty</CardTitle>
          <CardDescription>
            Your PyLinks rewards and achievements
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                  <Clock className="h-4 w-4 text-yellow-600" />
                </div>
                <div>
                  <p className="font-semibold">Spin Credits</p>
                  <p className="text-sm text-muted-foreground">
                    Available spins
                  </p>
                </div>
              </div>
              <p className="text-2xl font-bold">{spinCredits}</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                  <TrendingUp className="h-4 w-4 text-purple-600" />
                </div>
                <div>
                  <p className="font-semibold">Loyalty Points</p>
                  <p className="text-sm text-muted-foreground">
                    Accumulated points
                  </p>
                </div>
              </div>
              <p className="text-2xl font-bold">{loyaltyPoints}</p>
            </div>
          </div>

          <Separator className="my-4" />

          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              Earn 1 spin credit for every $1 in payments processed
            </p>
            <Button
              onClick={() => router.push("/dashboard/gamification")}
              variant="outline"
              size="sm"
            >
              Play Spin & Win
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
