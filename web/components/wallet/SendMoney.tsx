"use client";

import { useState } from "react";
import { Send, QrCode, Users, Clock, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { usePyLinksCore } from "@/hooks/usePyLinksCore";
import { useSendTransaction } from "@privy-io/react-auth";
import { openTransaction } from "@/lib/utils/blockscout";
import { ethers } from "ethers";
import { toast } from "sonner";
import { PyLinksCoreService } from "@/lib/contracts/pylinks-core";

export default function SendMoney() {
  const { createPayment, loading } = usePyLinksCore();
  const { sendTransaction } = useSendTransaction();
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [isOneTime, setIsOneTime] = useState(true);
  const [referralCode, setReferralCode] = useState("");
  const [paymentLink, setPaymentLink] = useState("");
  const [directTxHash, setDirectTxHash] = useState<string | null>(null);

  const handleDirectSend = async () => {
    if (!recipient || !amount || !description) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (parseFloat(amount) <= 0) {
      toast.error("Amount must be greater than 0");
      return;
    }

    try {
      // PYUSD transfer using Privy sendTransaction
      const PYUSD_ADDRESS = "0xCaC524BcA292aaade2DF8A05cC58F0a65B1B3bB9";
      const amountWei = ethers.utils.parseUnits(amount, 6); // PYUSD has 6 decimals
      
      const transferData = new ethers.utils.Interface([
        "function transfer(address to, uint256 amount) returns (bool)"
      ]).encodeFunctionData("transfer", [recipient, amountWei]);
      
      const result = await sendTransaction({
        to: PYUSD_ADDRESS,
        data: transferData
      }, {
        uiOptions: {
          showWalletUIs: false // No popup modals
        }
      });
      
      setDirectTxHash(result.hash);
      toast.success("Payment sent successfully!");
      
      // Reset form
      setRecipient("");
      setAmount("");
      setDescription("");
      setReferralCode("");
    } catch (error) {
      console.error("Send money error:", error);
    }
  };

  const handleCreatePaymentLink = async () => {
    if (!amount || !description) {
      toast.error("Please enter amount and description");
      return;
    }

    if (parseFloat(amount) <= 0) {
      toast.error("Amount must be greater than 0");
      return;
    }

    try {
      const sessionId = `link_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const request = {
        merchant: "0x0000000000000000000000000000000000000000", // Placeholder for payment link
        amount: amount,
        sessionId: sessionId,
        description: description,
        referralCode: referralCode || undefined,
        splits: [],
        isOneTime: isOneTime
      };

      const txHash = await createPayment(request);
      
      if (txHash) {
        const link = `${window.location.origin}/pay?session=${sessionId}`;
        setPaymentLink(link);
        toast.success("Payment link created successfully!");
      }
    } catch (error) {
      console.error("Create payment link error:", error);
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

  const calculateTotal = () => {
    const amt = parseFloat(amount) || 0;
    return amt + calculateFee();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Send Money</h1>
        <p className="text-muted-foreground">
          Send PYUSD directly to recipients or create payment links
        </p>
      </div>

      <Alert>
        <DollarSign className="h-4 w-4" />
        <AlertDescription>
          Send money instantly with low fees. Direct transfers are processed immediately, 
          while payment links allow recipients to claim payments within 10 minutes.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="direct" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="direct">Direct Send</TabsTrigger>
          <TabsTrigger value="link">Payment Link</TabsTrigger>
        </TabsList>

        <TabsContent value="direct" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="h-5 w-5" />
                Direct Transfer
              </CardTitle>
              <CardDescription>
                Send PYUSD directly to a recipient's wallet address
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="recipient">Recipient Address</Label>
                <Input
                  id="recipient"
                  placeholder="0x742d35Cc6634C0532925a3b8D9C9C0532925a3b8"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
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
                  placeholder="Payment for services, gift, etc."
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
                <Label htmlFor="one-time">One-time payment</Label>
              </div>

              {amount && (
                <div className="bg-muted p-4 rounded-lg space-y-2">
                  <div className="flex justify-between">
                    <span>Amount:</span>
                    <span className="font-mono">{parseFloat(amount).toFixed(6)} PYUSD</span>
                  </div>
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Platform Fee (0.1%):</span>
                    <span className="font-mono">{calculateFee().toFixed(6)} PYUSD</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-semibold">
                    <span>Total:</span>
                    <span className="font-mono">{calculateTotal().toFixed(6)} PYUSD</span>
                  </div>
                </div>
              )}

              <Button
                onClick={handleDirectSend}
                disabled={!recipient || !amount || !description}
                className="w-full"
              >
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send Money
                </>
              </Button>

              {/* Transaction Result */}
              {directTxHash && (
                <Card className="bg-green-50 border-green-200">
                  <CardHeader>
                    <CardTitle className="text-green-800">Payment Sent!</CardTitle>
                    <CardDescription className="text-green-600">
                      Your payment has been processed successfully
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between p-2 bg-white rounded">
                      <span className="text-sm">Transaction Hash:</span>
                      <div className="flex items-center gap-2">
                        <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                          {directTxHash.slice(0, 10)}...{directTxHash.slice(-8)}
                        </code>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openTransaction(directTxHash)}
                        >
                          View
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="link" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <QrCode className="h-5 w-5" />
                Payment Link
              </CardTitle>
              <CardDescription>
                Create a payment link that recipients can use to claim funds
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="link-amount">Amount (PYUSD)</Label>
                  <Input
                    id="link-amount"
                    type="number"
                    step="0.000001"
                    placeholder="25.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="link-referral">Referral Code (Optional)</Label>
                  <Input
                    id="link-referral"
                    placeholder="FRIEND123"
                    value={referralCode}
                    onChange={(e) => setReferralCode(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="link-description">Description</Label>
                <Textarea
                  id="link-description"
                  placeholder="Payment for services, gift, etc."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="link-one-time"
                  checked={isOneTime}
                  onCheckedChange={setIsOneTime}
                />
                <Label htmlFor="link-one-time">One-time payment</Label>
              </div>

              {amount && (
                <div className="bg-muted p-4 rounded-lg space-y-2">
                  <div className="flex justify-between">
                    <span>Amount:</span>
                    <span className="font-mono">{parseFloat(amount).toFixed(6)} PYUSD</span>
                  </div>
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Platform Fee (0.1%):</span>
                    <span className="font-mono">{calculateFee().toFixed(6)} PYUSD</span>
                  </div>
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Expires:</span>
                    <span>10 minutes after creation</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-semibold">
                    <span>Total:</span>
                    <span className="font-mono">{calculateTotal().toFixed(6)} PYUSD</span>
                  </div>
                </div>
              )}

              <Button
                onClick={handleCreatePaymentLink}
                disabled={!amount || !description || loading}
                className="w-full"
              >
                {loading ? (
                  <>Creating...</>
                ) : (
                  <>
                    <QrCode className="h-4 w-4 mr-2" />
                    Create Payment Link
                  </>
                )}
              </Button>

              {paymentLink && (
                <Card className="bg-green-50 border-green-200">
                  <CardHeader>
                    <CardTitle className="text-green-800">Payment Link Created!</CardTitle>
                    <CardDescription className="text-green-600">
                      Share this link with the recipient
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="p-3 bg-white border rounded-lg">
                      <p className="text-sm font-mono break-all">{paymentLink}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={copyPaymentLink} variant="outline" className="flex-1">
                        Copy Link
                      </Button>
                      <Button 
                        onClick={() => window.open(paymentLink, '_blank')} 
                        variant="outline"
                        className="flex-1"
                      >
                        Open Link
                      </Button>
                    </div>
                    <Alert>
                      <Clock className="h-4 w-4" />
                      <AlertDescription>
                        This payment link will expire in 10 minutes. The recipient must claim it before then.
                      </AlertDescription>
                    </Alert>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
