"use client";

import { useState, useEffect } from "react";
import { usePrivy } from "@privy-io/react-auth";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePyLinksCore } from "@/hooks/usePyLinksCore";
import { toast } from "sonner";

export default function Analytics() {
  const { user } = usePrivy();
  const {
    getMerchantEarnings,
    getMerchantPayments,
    getSpinCredits,
    getLoyaltyPoints,
  } = usePyLinksCore();
  const [timeRange, setTimeRange] = useState("7d");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalRevenue: "0.00",
    totalPayments: 0,
    averagePayment: "0.00",
    conversionRate: "0.0",
    spinCredits: "0",
    loyaltyPoints: "0",
  });

  useEffect(() => {
    loadAnalytics();
  }, [user?.wallet?.address, timeRange]);

  const loadAnalytics = async () => {
    if (!user?.wallet?.address) return;

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

      setStats({
        totalRevenue: totalRevenue.toFixed(2),
        totalPayments,
        averagePayment: averagePayment.toFixed(2),
        conversionRate: "85.2", // Mock data
        spinCredits: credits,
        loyaltyPoints: points,
      });
    } catch (error) {
      console.error("Error loading analytics:", error);
      toast.error("Failed to load analytics data");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Analytics</h1>
          <p className="text-muted-foreground">
            Loading your payment analytics...
          </p>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Analytics</h1>
          <p className="text-muted-foreground">
            Track your payment performance and business metrics
          </p>
        </div>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="24h">24 Hours</SelectItem>
            <SelectItem value="7d">7 Days</SelectItem>
            <SelectItem value="30d">30 Days</SelectItem>
            <SelectItem value="90d">90 Days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">
                  Total Revenue
                </p>
                <p className="text-2xl font-bold">{stats.totalRevenue} PYUSD</p>
                <div className="flex items-center text-xs text-green-600">
                  <ArrowUpRight className="h-3 w-3 mr-1" />
                  +12.5% from last period
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
                  Total Payments
                </p>
                <p className="text-2xl font-bold">{stats.totalPayments}</p>
                <div className="flex items-center text-xs text-green-600">
                  <ArrowUpRight className="h-3 w-3 mr-1" />
                  +8.2% from last period
                </div>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <BarChart3 className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">
                  Average Payment
                </p>
                <p className="text-2xl font-bold">
                  {stats.averagePayment} PYUSD
                </p>
                <div className="flex items-center text-xs text-red-600">
                  <ArrowDownRight className="h-3 w-3 mr-1" />
                  -2.1% from last period
                </div>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">
                  Conversion Rate
                </p>
                <p className="text-2xl font-bold">{stats.conversionRate}%</p>
                <div className="flex items-center text-xs text-green-600">
                  <ArrowUpRight className="h-3 w-3 mr-1" />
                  +5.3% from last period
                </div>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                <Users className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Detailed Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Revenue Trend</CardTitle>
            <CardDescription>
              Your revenue over the selected time period
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Revenue chart coming soon</p>
                <p className="text-sm">
                  Integration with charting library in progress
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payment Methods</CardTitle>
            <CardDescription>
              Breakdown of payment types used by customers
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span className="text-sm">Regular Payments</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">75%</span>
                <Badge variant="outline">Primary</Badge>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-sm">Escrow Payments</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">15%</span>
                <Badge variant="outline">Growing</Badge>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                <span className="text-sm">Bulk Payments</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">8%</span>
                <Badge variant="outline">New</Badge>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <span className="text-sm">Subscriptions</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">2%</span>
                <Badge variant="outline">Recurring</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gamification Stats */}
      <Card>
        <CardHeader>
          <CardTitle>Gamification & Rewards</CardTitle>
          <CardDescription>
            Your PyLinks rewards and customer engagement metrics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Calendar className="h-8 w-8 text-yellow-600" />
              </div>
              <p className="text-2xl font-bold">{stats.spinCredits}</p>
              <p className="text-sm text-muted-foreground">
                Spin Credits Earned
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <TrendingUp className="h-8 w-8 text-purple-600" />
              </div>
              <p className="text-2xl font-bold">{stats.loyaltyPoints}</p>
              <p className="text-sm text-muted-foreground">Loyalty Points</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Users className="h-8 w-8 text-green-600" />
              </div>
              <p className="text-2xl font-bold">Gold</p>
              <p className="text-sm text-muted-foreground">Merchant Tier</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Common analytics and reporting tasks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <Button variant="outline">Export Payment Data</Button>
            <Button variant="outline">Generate Report</Button>
            <Button variant="outline">View Tax Summary</Button>
            <Button variant="outline">Customer Insights</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
