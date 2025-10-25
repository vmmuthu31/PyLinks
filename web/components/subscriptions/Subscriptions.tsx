"use client";

import { useState } from "react";
import { 
  Calendar, 
  DollarSign, 
  Clock, 
  Repeat,
  Plus,
  Pause,
  Play,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { usePyLinksCore } from "@/hooks/usePyLinksCore";
import { toast } from "sonner";

export default function Subscriptions() {
  const { createSubscription, loading } = usePyLinksCore();
  const [merchant, setMerchant] = useState("");
  const [usdAmount, setUsdAmount] = useState("");
  const [interval, setInterval] = useState("monthly");
  const [maxPayments, setMaxPayments] = useState("");
  const [description, setDescription] = useState("");
  const [autoRenew, setAutoRenew] = useState(true);

  const handleCreateSubscription = async () => {
    if (!merchant || !usdAmount || !description) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (parseFloat(usdAmount) <= 0) {
      toast.error("Amount must be greater than 0");
      return;
    }

    try {
      const intervalSeconds = getIntervalSeconds(interval);
      const maxPaymentsNum = maxPayments ? parseInt(maxPayments) : 0;

      const request = {
        merchant,
        usdAmount,
        interval: intervalSeconds,
        maxPayments: maxPaymentsNum,
        description,
        autoRenew
      };

      const subscriptionId = await createSubscription(request);
      
      if (subscriptionId) {
        toast.success(`Subscription created! ID: ${subscriptionId}`);
        // Reset form
        setMerchant("");
        setUsdAmount("");
        setInterval("monthly");
        setMaxPayments("");
        setDescription("");
        setAutoRenew(true);
      }
    } catch (error) {
      console.error("Create subscription error:", error);
    }
  };

  const getIntervalSeconds = (interval: string) => {
    switch (interval) {
      case "daily": return 86400; // 24 hours
      case "weekly": return 604800; // 7 days
      case "monthly": return 2592000; // 30 days
      case "yearly": return 31536000; // 365 days
      default: return 2592000;
    }
  };

  const getIntervalLabel = (interval: string) => {
    switch (interval) {
      case "daily": return "Daily";
      case "weekly": return "Weekly";
      case "monthly": return "Monthly";
      case "yearly": return "Yearly";
      default: return "Monthly";
    }
  };

  const calculateNextPayment = () => {
    const now = new Date();
    const intervalMs = getIntervalSeconds(interval) * 1000;
    const nextPayment = new Date(now.getTime() + intervalMs);
    return nextPayment.toLocaleDateString();
  };

  const mockSubscriptions = [
    {
      id: 1,
      merchant: "0x742d35Cc6634C0532925a3b8D9C9C0532925a3b8",
      customer: "0x123d35Cc6634C0532925a3b8D9C9C0532925a3b8",
      usdAmount: "29.99",
      interval: "Monthly",
      nextPayment: "2024-02-15",
      status: "Active",
      description: "Premium Service Subscription"
    },
    {
      id: 2,
      merchant: "0x456d35Cc6634C0532925a3b8D9C9C0532925a3b8",
      customer: "0x789d35Cc6634C0532925a3b8D9C9C0532925a3b8",
      usdAmount: "9.99",
      interval: "Monthly",
      nextPayment: "2024-02-20",
      status: "Active",
      description: "Basic Plan Subscription"
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Subscriptions</h1>
        <p className="text-muted-foreground">
          Create and manage recurring payment subscriptions
        </p>
      </div>

      <Alert>
        <Repeat className="h-4 w-4" />
        <AlertDescription>
          Subscriptions enable automatic recurring payments with USD pricing via Pyth oracles. 
          Perfect for SaaS, memberships, and recurring services.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Create Subscription
              </CardTitle>
              <CardDescription>
                Set up a new recurring payment subscription
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="merchant">Merchant Address</Label>
                <Input
                  id="merchant"
                  placeholder="0x742d35Cc6634C0532925a3b8D9C9C0532925a3b8"
                  value={merchant}
                  onChange={(e) => setMerchant(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount (USD)</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    placeholder="29.99"
                    value={usdAmount}
                    onChange={(e) => setUsdAmount(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="interval">Billing Interval</Label>
                  <Select value={interval} onValueChange={setInterval}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="yearly">Yearly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="max-payments">Max Payments (Optional)</Label>
                <Input
                  id="max-payments"
                  type="number"
                  placeholder="12 (leave empty for unlimited)"
                  value={maxPayments}
                  onChange={(e) => setMaxPayments(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Leave empty for unlimited recurring payments
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Service Description</Label>
                <Textarea
                  id="description"
                  placeholder="Premium subscription service with full access..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="auto-renew"
                  checked={autoRenew}
                  onCheckedChange={setAutoRenew}
                />
                <Label htmlFor="auto-renew">
                  Auto-renew subscription when max payments reached
                </Label>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Active Subscriptions</CardTitle>
              <CardDescription>
                Manage your existing subscription plans
              </CardDescription>
            </CardHeader>
            <CardContent>
              {mockSubscriptions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No active subscriptions</p>
                  <p className="text-sm">Create your first subscription to get started</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {mockSubscriptions.map((subscription) => (
                    <div key={subscription.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h4 className="font-semibold">{subscription.description}</h4>
                          <p className="text-sm text-muted-foreground">
                            ${subscription.usdAmount} • {subscription.interval}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-green-600">
                            {subscription.status}
                          </Badge>
                          <Button variant="ghost" size="sm">
                            <Pause className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Customer</p>
                          <p className="font-mono">{subscription.customer.slice(0, 10)}...</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Next Payment</p>
                          <p>{subscription.nextPayment}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {usdAmount && (
            <Card>
              <CardHeader>
                <CardTitle>Subscription Preview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span>Amount:</span>
                  <span className="font-mono">${parseFloat(usdAmount).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Billing:</span>
                  <span>{getIntervalLabel(interval)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Max Payments:</span>
                  <span>{maxPayments || "Unlimited"}</span>
                </div>
                <div className="flex justify-between">
                  <span>Next Payment:</span>
                  <span>{calculateNextPayment()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Auto-renew:</span>
                  <span>{autoRenew ? "Yes" : "No"}</span>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Subscription Benefits</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-start gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-medium">USD Pricing</p>
                  <p className="text-muted-foreground">
                    Stable pricing using Pyth oracle feeds
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-2">
                <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-medium">Automated Billing</p>
                  <p className="text-muted-foreground">
                    Payments processed automatically on schedule
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-2">
                <Repeat className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-medium">Flexible Terms</p>
                  <p className="text-muted-foreground">
                    Daily, weekly, monthly, or yearly billing
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Button
            onClick={handleCreateSubscription}
            disabled={!merchant || !usdAmount || !description || loading}
            className="w-full"
            size="lg"
          >
            {loading ? (
              <>Creating Subscription...</>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Create Subscription
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
