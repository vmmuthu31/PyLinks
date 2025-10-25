"use client";

import { useState, useEffect } from "react";
import { usePrivy } from "@privy-io/react-auth";
import {
  Users,
  DollarSign,
  Share,
  Copy,
  Star,
  TrendingUp,
  Gift,
  Crown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { usePyLinksCore } from "@/hooks/usePyLinksCore";
import { AffiliateDetails } from "@/lib/contracts/pylinks-core";
import { toast } from "sonner";

export default function Affiliates() {
  const { user } = usePrivy();
  const {
    registerAffiliate,
    getAffiliate,
    getAffiliateEarnings,
    withdrawAffiliateEarnings,
    loading,
  } = usePyLinksCore();
  const [affiliateName, setAffiliateName] = useState("");
  const [preferredCode, setPreferredCode] = useState("");
  const [affiliate, setAffiliate] = useState<AffiliateDetails | null>(null);
  const [earnings, setEarnings] = useState("0.00");
  const [isRegistering, setIsRegistering] = useState(false);

  useEffect(() => {
    loadAffiliateData();
  }, [user?.wallet?.address]);

  const loadAffiliateData = async () => {
    if (!user?.wallet?.address) return;

    try {
      const [affiliateData, affiliateEarnings] = await Promise.all([
        getAffiliate(user.wallet.address),
        getAffiliateEarnings(user.wallet.address),
      ]);

      setAffiliate(affiliateData);
      setEarnings(parseFloat(affiliateEarnings).toFixed(2));
    } catch (error) {
      console.error("Error loading affiliate data:", error);
    }
  };

  const handleRegisterAffiliate = async () => {
    if (!affiliateName || !preferredCode) {
      toast.error("Please enter your name and preferred referral code");
      return;
    }

    try {
      setIsRegistering(true);
      const success = await registerAffiliate(affiliateName, preferredCode);

      if (success) {
        toast.success("Successfully registered as affiliate!");
        await loadAffiliateData();
        setAffiliateName("");
        setPreferredCode("");
      }
    } catch (error) {
      console.error("Register affiliate error:", error);
    } finally {
      setIsRegistering(false);
    }
  };

  const handleWithdrawEarnings = async () => {
    try {
      const success = await withdrawAffiliateEarnings();
      if (success) {
        toast.success("Earnings withdrawn successfully!");
        await loadAffiliateData();
      }
    } catch (error) {
      console.error("Withdraw earnings error:", error);
    }
  };

  const copyReferralLink = () => {
    if (affiliate) {
      const referralLink = `${window.location.origin}?ref=${affiliate.referralCode}`;
      navigator.clipboard.writeText(referralLink);
      toast.success("Referral link copied to clipboard!");
    }
  };

  const getTierBadge = (tier: number) => {
    switch (tier) {
      case 1:
        return (
          <Badge variant="outline" className="text-amber-600">
            <Star className="h-3 w-3 mr-1" />
            Bronze
          </Badge>
        );
      case 2:
        return (
          <Badge variant="outline" className="text-gray-600">
            <Star className="h-3 w-3 mr-1" />
            Silver
          </Badge>
        );
      case 3:
        return (
          <Badge variant="outline" className="text-yellow-600">
            <Star className="h-3 w-3 mr-1" />
            Gold
          </Badge>
        );
      case 4:
        return (
          <Badge variant="outline" className="text-blue-600">
            <Crown className="h-3 w-3 mr-1" />
            Diamond
          </Badge>
        );
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getTierRewards = (tier: number) => {
    switch (tier) {
      case 1:
        return "20% of platform fees";
      case 2:
        return "25% of platform fees + bonus rewards";
      case 3:
        return "30% of platform fees + premium support";
      case 4:
        return "35% of platform fees + exclusive perks";
      default:
        return "20% of platform fees";
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Affiliate Program</h1>
        <p className="text-muted-foreground">
          Earn rewards by referring new users to PyLinks
        </p>
      </div>

      <Alert>
        <Gift className="h-4 w-4" />
        <AlertDescription>
          Join our affiliate program and earn 20% of platform fees from users
          you refer. Higher tiers unlock better rewards and exclusive benefits!
        </AlertDescription>
      </Alert>

      {!affiliate ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Join Affiliate Program
            </CardTitle>
            <CardDescription>
              Register as an affiliate to start earning referral rewards
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Your Name</Label>
                <Input
                  id="name"
                  placeholder="John Doe"
                  value={affiliateName}
                  onChange={(e) => setAffiliateName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="code">Preferred Referral Code</Label>
                <Input
                  id="code"
                  placeholder="JOHNDOE2024"
                  value={preferredCode}
                  onChange={(e) =>
                    setPreferredCode(e.target.value.toUpperCase())
                  }
                />
              </div>
            </div>

            <div className="bg-muted p-4 rounded-lg">
              <h4 className="font-semibold mb-2">Affiliate Benefits:</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Earn 20% of platform fees from referrals</li>
                <li>• Tier-based rewards system with increasing benefits</li>
                <li>• Real-time tracking of referrals and earnings</li>
                <li>• Monthly bonus rewards for top performers</li>
              </ul>
            </div>

            <Button
              onClick={handleRegisterAffiliate}
              disabled={!affiliateName || !preferredCode || isRegistering}
              className="w-full"
            >
              {isRegistering ? (
                <>Registering...</>
              ) : (
                <>
                  <Users className="h-4 w-4 mr-2" />
                  Register as Affiliate
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Affiliate Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium leading-none">
                      Total Earnings
                    </p>
                    <p className="text-2xl font-bold">{earnings} PYUSD</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium leading-none">
                      Total Referrals
                    </p>
                    <p className="text-2xl font-bold">
                      {affiliate.totalReferrals}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium leading-none">
                      Referral Volume
                    </p>
                    <p className="text-2xl font-bold">
                      {parseFloat(affiliate.totalVolume).toFixed(2)} PYUSD
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <Star className="h-4 w-4 text-muted-foreground" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium leading-none">Tier</p>
                    <div className="mt-1">{getTierBadge(affiliate.tier)}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Affiliate Details */}
          <Card>
            <CardHeader>
              <CardTitle>Your Affiliate Profile</CardTitle>
              <CardDescription>
                Manage your affiliate account and referral links
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Affiliate Name</Label>
                  <p className="font-medium">{affiliate.name}</p>
                </div>
                <div>
                  <Label>Referral Code</Label>
                  <p className="font-mono">{affiliate.referralCode}</p>
                </div>
                <div>
                  <Label>Current Tier</Label>
                  <div className="mt-1">{getTierBadge(affiliate.tier)}</div>
                </div>
                <div>
                  <Label>Tier Rewards</Label>
                  <p className="text-sm text-muted-foreground">
                    {getTierRewards(affiliate.tier)}
                  </p>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>Your Referral Link</Label>
                <div className="flex gap-2">
                  <Input
                    value={`${window.location.origin}?ref=${affiliate.referralCode}`}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button
                    onClick={copyReferralLink}
                    variant="outline"
                    size="icon"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon">
                    <Share className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="flex gap-4">
                <Button
                  onClick={handleWithdrawEarnings}
                  disabled={parseFloat(earnings) === 0 || loading}
                  variant="outline"
                >
                  <DollarSign className="h-4 w-4 mr-2" />
                  Withdraw Earnings
                </Button>
                <Button variant="outline">
                  <Share className="h-4 w-4 mr-2" />
                  Share Referral Link
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Tier Progression */}
          <Card>
            <CardHeader>
              <CardTitle>Tier Progression</CardTitle>
              <CardDescription>
                Advance through tiers to unlock better rewards
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((tier) => (
                  <div
                    key={tier}
                    className={`p-4 rounded-lg border ${
                      affiliate.tier >= tier
                        ? "bg-primary/5 border-primary"
                        : "bg-muted/50"
                    }`}
                  >
                    <div className="text-center space-y-2">
                      {getTierBadge(tier)}
                      <p className="text-sm font-medium">
                        {tier === 1 && "Bronze Tier"}
                        {tier === 2 && "Silver Tier"}
                        {tier === 3 && "Gold Tier"}
                        {tier === 4 && "Diamond Tier"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {getTierRewards(tier)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
