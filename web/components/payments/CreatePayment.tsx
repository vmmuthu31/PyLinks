"use client";

import { useState } from "react";
import {
  Send,
  QrCode,
  Users,
  Clock,
  DollarSign,
  Plus,
  Trash2,
  Loader2,
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
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { usePyLinksCore } from "@/hooks/usePyLinksCore";
import { toast } from "sonner";

interface SplitRecipient {
  id: string;
  recipient: string;
  bps: string;
}

export default function CreatePayment() {
  const { createPayment, loading } = usePyLinksCore();
  const [merchant, setMerchant] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [isOneTime, setIsOneTime] = useState(true);
  const [splits, setSplits] = useState<SplitRecipient[]>([]);
  const [paymentLink, setPaymentLink] = useState("");

  const addSplit = () => {
    const newId = (splits.length + 1).toString();
    setSplits([...splits, { id: newId, recipient: "", bps: "" }]);
  };

  const removeSplit = (id: string) => {
    setSplits(splits.filter((split) => split.id !== id));
  };

  const updateSplit = (
    id: string,
    field: keyof SplitRecipient,
    value: string
  ) => {
    setSplits(
      splits.map((split) =>
        split.id === id ? { ...split, [field]: value } : split
      )
    );
  };

  const calculateTotalBps = () => {
    return splits.reduce(
      (total, split) => total + (parseInt(split.bps) || 0),
      0
    );
  };

  const handleCreatePayment = async () => {
    if (!merchant || !amount || !description) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (parseFloat(amount) <= 0) {
      toast.error("Amount must be greater than 0");
      return;
    }

    const totalBps = calculateTotalBps();
    if (totalBps > 10000) {
      toast.error("Total split percentage cannot exceed 100%");
      return;
    }

    try {
      const sessionId = `payment_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;

      const validSplits = splits
        .filter(
          (split) => split.recipient && split.bps && parseInt(split.bps) > 0
        )
        .map((split) => ({
          recipient: split.recipient,
          bps: parseInt(split.bps),
        }));

      const request = {
        merchant,
        amount,
        sessionId,
        description,
        referralCode: referralCode || undefined,
        splits: validSplits,
        isOneTime,
      };

      const txHash = await createPayment(request);

      if (txHash) {
        const link = `${window.location.origin}/pay?session=${sessionId}`;
        setPaymentLink(link);
        toast.success("Payment created successfully!");

        // Reset form
        setMerchant("");
        setAmount("");
        setDescription("");
        setReferralCode("");
        setSplits([]);
      }
    } catch (error) {
      console.error("Create payment error:", error);
    }
  };

  const copyPaymentLink = () => {
    navigator.clipboard.writeText(paymentLink);
    toast.success("Payment link copied to clipboard!");
  };

  const calculateFee = () => {
    const amt = parseFloat(amount) || 0;
    return amt * 0.001; // 0.1% platform fee
  };

  const calculateMerchantAmount = () => {
    const amt = parseFloat(amount) || 0;
    const fee = calculateFee();
    const totalSplitAmount = splits.reduce((total, split) => {
      const splitAmount = (amt * (parseInt(split.bps) || 0)) / 10000;
      return total + splitAmount;
    }, 0);
    return amt - fee - totalSplitAmount;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Create Payment</h1>
        <p className="text-muted-foreground">
          Create payment requests with optional splits and referral codes
        </p>
      </div>

      <Alert>
        <DollarSign className="h-4 w-4" />
        <AlertDescription>
          Create payment requests that customers can fulfill. Payments expire
          after 10 minutes and include a 0.1% platform fee. You can add payment
          splits for revenue sharing.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Payment Details</CardTitle>
          <CardDescription>Enter the basic payment information</CardDescription>
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
              <Label htmlFor="amount">Amount (PYUSD)</Label>
              <Input
                id="amount"
                type="number"
                step="0.000001"
                placeholder="25.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="referral">Referral Code (Optional)</Label>
              <Input
                id="referral"
                placeholder="FRIEND123"
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Payment for services, products, etc."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="one-time"
              checked={isOneTime}
              onCheckedChange={setIsOneTime}
            />
            <Label htmlFor="one-time">
              One-time payment (cannot be reused)
            </Label>
          </div>
        </CardContent>
      </Card>

      {/* Payment Splits */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Payment Splits (Optional)</CardTitle>
            <CardDescription>
              Automatically distribute payment to multiple recipients
            </CardDescription>
          </div>
          <Button onClick={addSplit} size="sm" variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            Add Split
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {splits.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No payment splits configured</p>
              <p className="text-sm">
                All payment will go to the merchant address
              </p>
            </div>
          ) : (
            <>
              {splits.map((split, index) => (
                <div key={split.id} className="p-4 border rounded-lg space-y-4">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline">Split #{index + 1}</Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeSplit(split.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-2 space-y-2">
                      <Label htmlFor={`recipient-${split.id}`}>
                        Recipient Address
                      </Label>
                      <Input
                        id={`recipient-${split.id}`}
                        placeholder="0x742d35Cc..."
                        value={split.recipient}
                        onChange={(e) =>
                          updateSplit(split.id, "recipient", e.target.value)
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`bps-${split.id}`}>Percentage (%)</Label>
                      <Input
                        id={`bps-${split.id}`}
                        type="number"
                        min="0"
                        max="100"
                        placeholder="10"
                        value={
                          split.bps
                            ? (parseInt(split.bps) / 100).toString()
                            : ""
                        }
                        onChange={(e) =>
                          updateSplit(
                            split.id,
                            "bps",
                            (parseFloat(e.target.value) * 100).toString()
                          )
                        }
                      />
                    </div>
                  </div>
                </div>
              ))}

              <div className="bg-muted p-4 rounded-lg">
                <div className="flex justify-between items-center">
                  <span>Total Split Percentage:</span>
                  <Badge
                    variant={
                      calculateTotalBps() > 10000 ? "destructive" : "outline"
                    }
                  >
                    {(calculateTotalBps() / 100).toFixed(2)}%
                  </Badge>
                </div>
                {calculateTotalBps() > 10000 && (
                  <p className="text-sm text-red-600 mt-2">
                    Total percentage cannot exceed 100%
                  </p>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Payment Summary */}
      {amount && (
        <Card>
          <CardHeader>
            <CardTitle>Payment Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span>Payment Amount:</span>
              <span className="font-mono">
                {parseFloat(amount).toFixed(6)} PYUSD
              </span>
            </div>
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Platform Fee (0.1%):</span>
              <span className="font-mono">
                {calculateFee().toFixed(6)} PYUSD
              </span>
            </div>
            {splits.length > 0 && (
              <>
                <Separator />
                <div className="space-y-2">
                  <p className="font-medium">Payment Distribution:</p>
                  {splits.map((split, index) => {
                    const splitAmount =
                      (parseFloat(amount) * (parseInt(split.bps) || 0)) / 10000;
                    return (
                      <div
                        key={split.id}
                        className="flex justify-between text-sm"
                      >
                        <span>
                          Split #{index + 1} (
                          {(parseInt(split.bps) / 100).toFixed(1)}%):
                        </span>
                        <span className="font-mono">
                          {splitAmount.toFixed(6)} PYUSD
                        </span>
                      </div>
                    );
                  })}
                  <div className="flex justify-between font-medium">
                    <span>Merchant Receives:</span>
                    <span className="font-mono">
                      {calculateMerchantAmount().toFixed(6)} PYUSD
                    </span>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      <Button
        onClick={handleCreatePayment}
        disabled={
          !merchant ||
          !amount ||
          !description ||
          loading ||
          calculateTotalBps() > 10000
        }
        className="w-full"
        size="lg"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Creating Payment...
          </>
        ) : (
          <>
            <QrCode className="h-4 w-4 mr-2" />
            Create Payment Request
          </>
        )}
      </Button>

      {paymentLink && (
        <Card className="bg-green-50 border-green-200">
          <CardHeader>
            <CardTitle className="text-green-800">
              Payment Created Successfully!
            </CardTitle>
            <CardDescription className="text-green-600">
              Share this link with customers to receive payment
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3 bg-white border rounded-lg">
              <p className="text-sm font-mono break-all">{paymentLink}</p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={copyPaymentLink}
                variant="outline"
                className="flex-1"
              >
                Copy Link
              </Button>
              <Button
                onClick={() => window.open(paymentLink, "_blank")}
                variant="outline"
                className="flex-1"
              >
                Open Link
              </Button>
            </div>
            <Alert>
              <Clock className="h-4 w-4" />
              <AlertDescription>
                This payment link will expire in 10 minutes. Customers must
                complete payment before then.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
