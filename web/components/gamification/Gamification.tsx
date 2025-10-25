"use client";

import { useState, useEffect } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { 
  Zap, 
  Gift, 
  Star, 
  Trophy, 
  Target,
  Sparkles,
  Crown,
  Medal
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { usePyLinksCore } from "@/hooks/usePyLinksCore";
import { toast } from "sonner";

export default function Gamification() {
  const { user } = usePrivy();
  const { getSpinCredits, getLoyaltyPoints } = usePyLinksCore();
  const [spinCredits, setSpinCredits] = useState("0");
  const [loyaltyPoints, setLoyaltyPoints] = useState("0");
  const [isSpinning, setIsSpinning] = useState(false);
  const [lastWin, setLastWin] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadGamificationData();
  }, [user?.wallet?.address]);

  const loadGamificationData = async () => {
    if (!user?.wallet?.address) return;

    try {
      setLoading(true);
      const [credits, points] = await Promise.all([
        getSpinCredits(user.wallet.address),
        getLoyaltyPoints(user.wallet.address)
      ]);

      setSpinCredits(credits);
      setLoyaltyPoints(points);
    } catch (error) {
      console.error("Error loading gamification data:", error);
      toast.error("Failed to load gamification data");
    } finally {
      setLoading(false);
    }
  };

  const handleSpin = async () => {
    if (parseInt(spinCredits) === 0) {
      toast.error("No spin credits available");
      return;
    }

    setIsSpinning(true);
    
    // Simulate spin animation
    setTimeout(() => {
      const prizes = [
        "0.1 PYUSD",
        "0.5 PYUSD", 
        "1.0 PYUSD",
        "5 Loyalty Points",
        "10 Loyalty Points",
        "Better luck next time!"
      ];
      
      const randomPrize = prizes[Math.floor(Math.random() * prizes.length)];
      setLastWin(randomPrize);
      
      // Decrease spin credits (this would be handled by contract)
      const newCredits = Math.max(0, parseInt(spinCredits) - 1);
      setSpinCredits(newCredits.toString());
      
      if (randomPrize !== "Better luck next time!") {
        toast.success(`🎉 You won ${randomPrize}!`);
      } else {
        toast.info("Better luck next time!");
      }
      
      setIsSpinning(false);
    }, 3000);
  };

  const getLoyaltyTier = (points: number) => {
    if (points >= 10000) return { name: "Diamond", icon: Crown, color: "text-blue-600" };
    if (points >= 5000) return { name: "Gold", icon: Trophy, color: "text-yellow-600" };
    if (points >= 1000) return { name: "Silver", icon: Medal, color: "text-gray-600" };
    return { name: "Bronze", icon: Star, color: "text-amber-600" };
  };

  const getNextTierProgress = (points: number) => {
    if (points >= 10000) return { progress: 100, nextTier: "Max Level", pointsNeeded: 0 };
    if (points >= 5000) return { progress: ((points - 5000) / 5000) * 100, nextTier: "Diamond", pointsNeeded: 10000 - points };
    if (points >= 1000) return { progress: ((points - 1000) / 4000) * 100, nextTier: "Gold", pointsNeeded: 5000 - points };
    return { progress: (points / 1000) * 100, nextTier: "Silver", pointsNeeded: 1000 - points };
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Spin & Win</h1>
          <p className="text-muted-foreground">Loading your rewards...</p>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  const currentPoints = parseInt(loyaltyPoints);
  const tier = getLoyaltyTier(currentPoints);
  const progress = getNextTierProgress(currentPoints);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Spin & Win</h1>
        <p className="text-muted-foreground">
          Use your spin credits to win PYUSD rewards and loyalty points
        </p>
      </div>

      <Alert>
        <Sparkles className="h-4 w-4" />
        <AlertDescription>
          Earn 1 spin credit for every $1 in payments processed. Spin to win PYUSD rewards, 
          loyalty points, and unlock exclusive merchant benefits!
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Spin Wheel */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Spin Wheel
              </CardTitle>
              <CardDescription>
                Use your spin credits to win amazing prizes
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex justify-center">
                <div className={`relative w-64 h-64 rounded-full border-8 border-primary ${isSpinning ? 'animate-spin' : ''}`}>
                  <div className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-400 via-purple-500 to-pink-500 flex items-center justify-center">
                    <div className="w-48 h-48 rounded-full bg-white flex items-center justify-center">
                      <div className="text-center">
                        <Zap className="h-12 w-12 mx-auto mb-2 text-primary" />
                        <p className="font-bold text-lg">PyLinks</p>
                        <p className="text-sm text-muted-foreground">Spin & Win</p>
                      </div>
                    </div>
                  </div>
                  {/* Pointer */}
                  <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-2">
                    <div className="w-0 h-0 border-l-4 border-r-4 border-b-8 border-l-transparent border-r-transparent border-b-red-500"></div>
                  </div>
                </div>
              </div>

              <div className="text-center space-y-4">
                <div className="flex items-center justify-center gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold">{spinCredits}</p>
                    <p className="text-sm text-muted-foreground">Spin Credits</p>
                  </div>
                </div>

                <Button
                  onClick={handleSpin}
                  disabled={parseInt(spinCredits) === 0 || isSpinning}
                  size="lg"
                  className="w-full"
                >
                  {isSpinning ? (
                    <>
                      <Zap className="h-4 w-4 mr-2 animate-pulse" />
                      Spinning...
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4 mr-2" />
                      Spin Now!
                    </>
                  )}
                </Button>

                {lastWin && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-green-800 font-medium">Last Win: {lastWin}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Loyalty & Rewards */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <tier.icon className={`h-5 w-5 ${tier.color}`} />
                Loyalty Tier
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <Badge variant="outline" className={`${tier.color} text-lg px-3 py-1`}>
                  <tier.icon className="h-4 w-4 mr-1" />
                  {tier.name}
                </Badge>
                <p className="text-2xl font-bold mt-2">{loyaltyPoints}</p>
                <p className="text-sm text-muted-foreground">Loyalty Points</p>
              </div>

              {progress.pointsNeeded > 0 && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progress to {progress.nextTier}</span>
                    <span>{progress.pointsNeeded} points needed</span>
                  </div>
                  <Progress value={progress.progress} className="h-2" />
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gift className="h-5 w-5" />
                Possible Prizes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">0.1 PYUSD</span>
                  <Badge variant="outline">Common</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">0.5 PYUSD</span>
                  <Badge variant="outline">Uncommon</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">1.0 PYUSD</span>
                  <Badge variant="outline">Rare</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">5 Loyalty Points</span>
                  <Badge variant="outline">Common</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">10 Loyalty Points</span>
                  <Badge variant="outline">Uncommon</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                How to Earn
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                  <div>
                    <p className="font-medium">Process Payments</p>
                    <p className="text-muted-foreground">1 credit per $1 processed</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                  <div>
                    <p className="font-medium">Refer Users</p>
                    <p className="text-muted-foreground">Bonus credits for referrals</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                  <div>
                    <p className="font-medium">Daily Login</p>
                    <p className="text-muted-foreground">Free credits for active users</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Tier Benefits */}
      <Card>
        <CardHeader>
          <CardTitle>Tier Benefits</CardTitle>
          <CardDescription>
            Unlock exclusive benefits as you advance through loyalty tiers
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-lg border bg-amber-50 border-amber-200">
              <div className="text-center space-y-2">
                <Star className="h-8 w-8 mx-auto text-amber-600" />
                <h3 className="font-semibold">Bronze</h3>
                <p className="text-xs text-muted-foreground">0 - 999 points</p>
                <ul className="text-xs space-y-1">
                  <li>• Basic spin rewards</li>
                  <li>• Standard support</li>
                </ul>
              </div>
            </div>

            <div className="p-4 rounded-lg border bg-gray-50 border-gray-200">
              <div className="text-center space-y-2">
                <Medal className="h-8 w-8 mx-auto text-gray-600" />
                <h3 className="font-semibold">Silver</h3>
                <p className="text-xs text-muted-foreground">1,000 - 4,999 points</p>
                <ul className="text-xs space-y-1">
                  <li>• 10% bonus rewards</li>
                  <li>• Priority support</li>
                </ul>
              </div>
            </div>

            <div className="p-4 rounded-lg border bg-yellow-50 border-yellow-200">
              <div className="text-center space-y-2">
                <Trophy className="h-8 w-8 mx-auto text-yellow-600" />
                <h3 className="font-semibold">Gold</h3>
                <p className="text-xs text-muted-foreground">5,000 - 9,999 points</p>
                <ul className="text-xs space-y-1">
                  <li>• 25% bonus rewards</li>
                  <li>• Exclusive prizes</li>
                  <li>• Premium support</li>
                </ul>
              </div>
            </div>

            <div className="p-4 rounded-lg border bg-blue-50 border-blue-200">
              <div className="text-center space-y-2">
                <Crown className="h-8 w-8 mx-auto text-blue-600" />
                <h3 className="font-semibold">Diamond</h3>
                <p className="text-xs text-muted-foreground">10,000+ points</p>
                <ul className="text-xs space-y-1">
                  <li>• 50% bonus rewards</li>
                  <li>• VIP prizes</li>
                  <li>• Dedicated support</li>
                  <li>• Early access features</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
