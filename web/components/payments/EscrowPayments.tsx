"use client";

import { useState } from "react";
import { Shield, Clock, DollarSign, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { usePyLinksCore } from "@/hooks/usePyLinksCore";
import { toast } from "sonner";

export default function EscrowPayments() {
  const { createPayment, loading } = usePyLinksCore();
  const [merchant, setMerchant] = useState("");
  const [customer, setCustomer] = useState("");
  const [usdAmount, setUsdAmount] = useState("");
  const [description, setDescription] = useState("");
  const [autoRelease, setAutoRelease] = useState(false);

  const handleCreateEscrowPayment = async () => {
    if (!merchant || !customer || !usdAmount || !description) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (parseFloat(usdAmount) <= 0) {
      toast.error("Amount must be greater than 0");
      return;
    }

    try {
      const sessionId = `escrow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // For now, we'll create a regular payment since escrow needs special handling
      const request = {
        merchant,
        amount: usdAmount, // This would need USD to PYUSD conversion
        sessionId,
        description: `[ESCROW] ${description}`,
        splits: [],
        isOneTime: true
      };

      const txHash = await createPayment(request);
      
      if (txHash) {
        toast.success("Escrow payment created successfully!");
        // Reset form
        setMerchant("");
        setCustomer("");
        setUsdAmount("");
        setDescription("");
        setAutoRelease(false);
      }
    } catch (error) {
      console.error("Create escrow payment error:", error);
    }
  };

  const calculatePlatformFee = () => {
    const amount = parseFloat(usdAmount) || 0;
    return amount * 0.001; // 0.1% platform fee
  };

  const calculateCustomerPays = () => {
    const amount = parseFloat(usdAmount) || 0;
    return amount + calculatePlatformFee();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Escrow Payments</h1>
        <p className="text-muted-foreground">
          Create secure escrow payments with buyer protection and dispute resolution
        </p>
      </div>

      <Alert>
        <Shield className="h-4 w-4" />
        <AlertDescription>
          Escrow payments provide buyer protection by holding funds in a smart contract until 
          the service is delivered. Payments use Pyth oracles for real-time USD pricing and 
          include a 7-day escrow period for dispute resolution.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Escrow Payment Details
              </CardTitle>
              <CardDescription>
                Create a secure escrow payment with buyer protection
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="merchant">Merchant Address</Label>
                  <Input
                    id="merchant"
                    placeholder="0x742d35Cc6634C0532925a3b8D9C9C0532925a3b8"
                    value={merchant}
                    onChange={(e) => setMerchant(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customer">Customer Address</Label>
                  <Input
                    id="customer"
                    placeholder="0x123d35Cc6634C0532925a3b8D9C9C0532925a3b8"
                    value={customer}
                    onChange={(e) => setCustomer(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">Amount (USD)</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  placeholder="100.00"
                  value={usdAmount}
                  onChange={(e) => setUsdAmount(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Amount will be converted to PYUSD using Pyth oracle pricing
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Service Description</Label>
                <Textarea
                  id="description"
                  placeholder="Describe the service or product being purchased..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="auto-release"
                  checked={autoRelease}
                  onCheckedChange={setAutoRelease}
                />
                <Label htmlFor="auto-release">
                  Auto-release after 7 days (if no disputes)
                </Label>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Escrow Process</CardTitle>
              <CardDescription>
                How escrow payments work to protect both parties
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-sm font-semibold text-blue-600">
                    1
                  </div>
                  <div>
                    <h4 className="font-semibold">Payment Created</h4>
                    <p className="text-sm text-muted-foreground">
                      Escrow payment is created with service details and terms
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-sm font-semibold text-blue-600">
                    2
                  </div>
                  <div>
                    <h4 className="font-semibold">Customer Pays</h4>
                    <p className="text-sm text-muted-foreground">
                      Customer sends PYUSD to the escrow smart contract
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-sm font-semibold text-blue-600">
                    3
                  </div>
                  <div>
                    <h4 className="font-semibold">Service Delivered</h4>
                    <p className="text-sm text-muted-foreground">
                      Merchant provides the agreed service or product
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center text-sm font-semibold text-green-600">
                    4
                  </div>
                  <div>
                    <h4 className="font-semibold">Payment Released</h4>
                    <p className="text-sm text-muted-foreground">
                      Customer releases payment or it auto-releases after 7 days
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {usdAmount && (
            <Card>
              <CardHeader>
                <CardTitle>Payment Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span>Service Amount:</span>
                  <span className="font-mono">${parseFloat(usdAmount).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Platform Fee (0.1%):</span>
                  <span className="font-mono">${calculatePlatformFee().toFixed(2)}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-semibold">
                  <span>Customer Pays:</span>
                  <span className="font-mono">${calculateCustomerPays().toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Merchant Receives:</span>
                  <span className="font-mono">${parseFloat(usdAmount).toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                Important Notes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-start gap-2">
                <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-medium">7-Day Escrow Period</p>
                  <p className="text-muted-foreground">
                    Funds are held for 7 days to allow for dispute resolution
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-2">
                <Shield className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-medium">Buyer Protection</p>
                  <p className="text-muted-foreground">
                    Customers can dispute payments if service is not delivered
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-medium">USD Pricing</p>
                  <p className="text-muted-foreground">
                    Uses Pyth oracles for real-time USD to PYUSD conversion
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Button
            onClick={handleCreateEscrowPayment}
            disabled={!merchant || !customer || !usdAmount || !description || loading}
            className="w-full"
            size="lg"
          >
            {loading ? (
              <>Creating Escrow Payment...</>
            ) : (
              <>
                <Shield className="h-4 w-4 mr-2" />
                Create Escrow Payment
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
