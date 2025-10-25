"use client";

import { useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import {
  Wallet,
  Eye,
  EyeOff,
  RefreshCw,
  Copy,
  ExternalLink,
  TrendingUp,
  DollarSign,
  Coins,
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
import { Skeleton } from "@/components/ui/skeleton";
import { useWalletBalance } from "@/hooks/useWalletBalance";
import {
  formatAddress,
  getAddressUrl,
  openAddress,
} from "@/lib/utils/blockscout";
import { toast } from "sonner";

interface WalletBalanceProps {
  showHeader?: boolean;
  compact?: boolean;
  className?: string;
}

export default function WalletBalance({
  showHeader = true,
  compact = false,
  className = "",
}: WalletBalanceProps) {
  const { user } = usePrivy();
  const { balances, loading, refreshBalances, formatBalance, formatUSD } =
    useWalletBalance();
  const [showBalances, setShowBalances] = useState(true);

  const copyAddress = async () => {
    if (user?.wallet?.address) {
      await navigator.clipboard.writeText(user.wallet.address);
      toast.success("Wallet address copied!");
    }
  };

  const viewOnExplorer = () => {
    if (user?.wallet?.address) {
      openAddress(user.wallet.address);
    }
  };

  if (!user?.wallet?.address) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <Wallet className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No wallet connected</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (compact) {
    return (
      <Card className={className}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <Wallet className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="font-medium">Total Balance</p>
                <p className="text-sm text-muted-foreground">
                  {formatAddress(user.wallet.address)}
                </p>
              </div>
            </div>
            <div className="text-right">
              {loading ? (
                <Skeleton className="h-6 w-20" />
              ) : (
                <p className="font-bold text-lg">
                  {showBalances ? formatUSD(balances.totalUSD) : "••••••"}
                </p>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowBalances(!showBalances)}
                className="h-6 w-6 p-0"
              >
                {showBalances ? (
                  <EyeOff className="h-3 w-3" />
                ) : (
                  <Eye className="h-3 w-3" />
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      {showHeader && (
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5" />
                Wallet Balance
              </CardTitle>
              <CardDescription>
                Your ETH and PYUSD balances on Sepolia
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowBalances(!showBalances)}
              >
                {showBalances ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={refreshBalances}
                disabled={loading}
              >
                <RefreshCw
                  className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
                />
              </Button>
            </div>
          </div>
        </CardHeader>
      )}

      <CardContent className="space-y-6">
        {/* Wallet Address */}
        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-mono text-xs">
              {formatAddress(user.wallet.address)}
            </Badge>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={copyAddress}>
              <Copy className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="sm" onClick={viewOnExplorer}>
              <ExternalLink className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Total Balance */}
        <div className="text-center py-4">
          <p className="text-sm text-muted-foreground mb-2">
            Total Portfolio Value
          </p>
          {loading ? (
            <Skeleton className="h-10 w-32 mx-auto" />
          ) : (
            <p className="text-3xl font-bold">
              {showBalances ? formatUSD(balances.totalUSD) : "••••••••"}
            </p>
          )}
        </div>

        <Separator />

        {/* Individual Balances */}
        <div className="space-y-4">
          {/* ETH Balance */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                <Coins className="h-5 w-5 text-gray-600" />
              </div>
              <div>
                <p className="font-medium">Ethereum</p>
                <p className="text-sm text-muted-foreground">ETH</p>
              </div>
            </div>
            <div className="text-right">
              {loading ? (
                <div className="space-y-1">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-3 w-12" />
                </div>
              ) : (
                <div>
                  <p className="font-medium">
                    {showBalances
                      ? `${formatBalance(balances.eth)} ETH`
                      : "••••••"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {showBalances ? formatUSD(balances.ethUSD) : "••••••"}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* PYUSD Balance */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="font-medium">PayPal USD</p>
                <p className="text-sm text-muted-foreground">PYUSD</p>
              </div>
            </div>
            <div className="text-right">
              {loading ? (
                <div className="space-y-1">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-3 w-12" />
                </div>
              ) : (
                <div>
                  <p className="font-medium">
                    {showBalances
                      ? `${formatBalance(balances.pyusd)} PYUSD`
                      : "••••••"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {showBalances ? formatUSD(balances.pyusdUSD) : "••••••"}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Network Info */}
        <div className="text-center">
          <Badge variant="secondary" className="text-xs">
            Ethereum Sepolia Testnet
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
