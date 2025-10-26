"use client";

import { useState, useEffect } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useRouter, usePathname } from "next/navigation";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Users,
  Activity,
  Send,
  Receipt,
  Clock,
  CheckCircle,
  Star,
  Zap,
  Gift,
  Crown,
  Calendar,
  Target,
  Wallet,
  Eye,
  FileText,
  Loader2,
} from "lucide-react";
import { usePyLinksCore } from "@/hooks/usePyLinksCore";
import { toast } from "sonner";
import WalletBalance from "@/components/wallet/WalletBalance";

export default function CleanDashboard() {
  const { user, logout } = usePrivy();
  const router = useRouter();
  const pathname = usePathname();
  const {
    getMerchantEarnings,
    getMerchantPayments,
    getSpinCredits,
    getLoyaltyPoints,
    loading: coreLoading,
  } = usePyLinksCore();

  const [timeRange, setTimeRange] = useState("7d");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalRevenue: "0.00",
    totalPayments: 0,
    averagePayment: "0.00",
    conversionRate: "85.2",
    spinCredits: "0",
    loyaltyPoints: "0",
    activePayments: 0,
    totalFees: "0.00",
    growth: {
      revenue: "+12.5%",
      payments: "+8.3%",
      conversion: "+2.1%",
    },
  });

  useEffect(() => {
    loadDashboardData();
  }, [user?.wallet?.address, timeRange]);

  const loadDashboardData = async () => {
    if (!user?.wallet?.address) {
      console.log("⚠️ No wallet address found for user:", user);
      return;
    }

    try {
      setLoading(true);

      const [earnings, paymentIds, credits, points] = await Promise.all([
        getMerchantEarnings(user.wallet.address),
        getMerchantPayments(user.wallet.address),
        getSpinCredits(user.wallet.address),
        getLoyaltyPoints(user.wallet.address),
      ]);

      const totalRevenue = parseFloat(earnings);
      const totalPayments = paymentIds.length;
      const averagePayment =
        totalPayments > 0 ? totalRevenue / totalPayments : 0;
      const totalFees = totalRevenue * 0.001; // 0.1% platform fee

      setStats({
        totalRevenue: totalRevenue.toFixed(2),
        totalPayments,
        averagePayment: averagePayment.toFixed(2),
        conversionRate: "85.2", // Mock data
        spinCredits: credits,
        loyaltyPoints: points,
        activePayments: Math.floor(totalPayments * 0.3), // Mock active payments
        totalFees: totalFees.toFixed(2),
        growth: {
          revenue: "+12.5%",
          payments: "+8.3%",
          conversion: "+2.1%",
        },
      });
    } catch (error) {
      console.error("Error loading dashboard data:", error);
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const quickActions = [
    {
      title: "Create Payment",
      description: "Generate new payment link",
      icon: Plus,
      href: "/dashboard/payments/create",
      color: "bg-blue-500",
    },
    {
      title: "Send Money",
      description: "Transfer funds directly",
      icon: Send,
      href: "/dashboard/wallet/send",
      color: "bg-green-500",
    },
    {
      title: "Bulk Payments",
      description: "Send to multiple recipients",
      icon: Users,
      href: "/dashboard/bulk/multiple",
      color: "bg-purple-500",
    },
    {
      title: "Spin & Win",
      description: "Use your spin credits",
      icon: Zap,
      href: "/dashboard/gamification",
      color: "bg-yellow-500",
    },
  ];

  // Check if user has wallet but no address (edge case)
  if (user && !user.wallet?.address) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">Wallet connection required</p>
          </div>
        </div>

        <Alert className="max-w-2xl">
          <Wallet className="h-4 w-4" />
          <AlertDescription>
            Your wallet connection seems to be missing. Please logout and login
            again to reconnect your wallet.
          </AlertDescription>
        </Alert>

        <Button
          onClick={async () => {
            try {
              await logout();
              router.push("/");
            } catch (error) {
              console.error("Logout error:", error);
              router.push("/");
            }
          }}
          variant="outline"
        >
          Logout and Reconnect
        </Button>
      </div>
    );
  }

  if (loading || coreLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">
              Loading your PyLinks overview...
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-gray-200 rounded animate-pulse"></div>
                  <div className="space-y-2 flex-1">
                    <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                    <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back! Here's your PyLinks overview
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">Last 24h</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Wallet Balance Section - Only show on main dashboard */}
      {pathname === "/dashboard" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <WalletBalance showHeader={true} compact={false} />
          </div>
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Quick Actions
                </CardTitle>
                <CardDescription>Fast access to common tasks</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {quickActions.slice(0, 3).map((action, index) => {
                  const Icon = action.icon;
                  return (
                    <Button
                      key={index}
                      variant="outline"
                      className="w-full justify-start h-auto p-3"
                      onClick={() => router.push(action.href)}
                    >
                      <div
                        className={`w-8 h-8 rounded-full ${action.color} flex items-center justify-center mr-3`}
                      >
                        <Icon className="h-4 w-4 text-white" />
                      </div>
                      <div className="text-left">
                        <p className="font-medium text-sm">{action.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {action.description}
                        </p>
                      </div>
                    </Button>
                  );
                })}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold">${stats.totalRevenue}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <div className="flex items-center mt-2">
              <TrendingUp className="h-3 w-3 text-green-600 mr-1" />
              <span className="text-xs text-green-600 font-medium">
                {stats.growth.revenue}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Payments</p>
                <p className="text-2xl font-bold">{stats.totalPayments}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Receipt className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <div className="flex items-center mt-2">
              <TrendingUp className="h-3 w-3 text-blue-600 mr-1" />
              <span className="text-xs text-blue-600 font-medium">
                {stats.growth.payments}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Payment</p>
                <p className="text-2xl font-bold">${stats.averagePayment}</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <BarChart3 className="h-6 w-6 text-purple-600" />
              </div>
            </div>
            <div className="flex items-center mt-2">
              <TrendingUp className="h-3 w-3 text-purple-600 mr-1" />
              <span className="text-xs text-purple-600 font-medium">+5.2%</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Payments</p>
                <p className="text-2xl font-bold">{stats.activePayments}</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                <Clock className="h-6 w-6 text-orange-600" />
              </div>
            </div>
            <div className="flex items-center mt-2">
              <Activity className="h-3 w-3 text-orange-600 mr-1" />
              <span className="text-xs text-orange-600 font-medium">Live</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Analytics & Gamification */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Performance Analytics
            </CardTitle>
            <CardDescription>Your payment processing insights</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-muted-foreground">Conversion Rate</p>
                <p className="text-lg font-bold">{stats.conversionRate}%</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-muted-foreground">Platform Fees</p>
                <p className="text-lg font-bold">${stats.totalFees}</p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Payment Success Rate</span>
                <span className="font-medium">94.2%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full"
                  style={{ width: "94.2%" }}
                ></div>
              </div>
            </div>

            <Button
              variant="outline"
              className="w-full"
              onClick={() => router.push("/dashboard/payments/history")}
            >
              <FileText className="h-4 w-4 mr-2" />
              View Detailed Reports
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Rewards & Gamification
            </CardTitle>
            <CardDescription>Your loyalty status and rewards</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-muted-foreground">Spin Credits</p>
                <p className="text-lg font-bold">{stats.spinCredits}</p>
              </div>
              <div className="p-3 bg-purple-50 rounded-lg">
                <p className="text-sm text-muted-foreground">Loyalty Points</p>
                <p className="text-lg font-bold">{stats.loyaltyPoints}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="font-medium">Silver Tier</p>
                <p className="text-sm text-muted-foreground">
                  1,250 points to Gold
                </p>
              </div>
            </div>

            <Button
              className="w-full"
              onClick={() => router.push("/dashboard/gamification")}
            >
              <Zap className="h-4 w-4 mr-2" />
              Play Spin & Win
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>
            Your latest transactions and updates
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              {
                type: "payment",
                title: "Payment Received",
                description: "$25.00 from 0x123...abc",
                time: "2 minutes ago",
                icon: ArrowDownRight,
                color: "text-green-600",
              },
              {
                type: "bulk",
                title: "Bulk Payment Sent",
                description: "5 payments totaling $150.00",
                time: "1 hour ago",
                icon: Users,
                color: "text-blue-600",
              },
              {
                type: "reward",
                title: "Spin Credits Earned",
                description: "Earned 3 spin credits",
                time: "3 hours ago",
                icon: Zap,
                color: "text-yellow-600",
              },
            ].map((activity, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-3 border rounded-lg"
              >
                <div
                  className={`w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center`}
                >
                  <activity.icon className={`h-5 w-5 ${activity.color}`} />
                </div>
                <div className="flex-1">
                  <p className="font-medium">{activity.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {activity.description}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">{activity.time}</p>
              </div>
            ))}
          </div>

          <Button
            variant="outline"
            className="w-full mt-4"
            onClick={() => router.push("/dashboard/notifications")}
          >
            <Eye className="h-4 w-4 mr-2" />
            View All Activity
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
