"use client";

import { useState, useEffect } from "react";
import { usePrivy } from "@privy-io/react-auth";
import {
  QrCode,
  Copy,
  Share,
  Download,
  Wallet,
  DollarSign,
  Clock,
  CheckCircle,
  ExternalLink,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { usePyLinksCore } from "@/hooks/usePyLinksCore";
import { toast } from "sonner";
import QRCodeLib from "qrcode";
import WalletBalance from "@/components/wallet/WalletBalance";

interface PendingPayment {
  id: number;
  amount: string;
  description: string;
  createdAt: number;
  expiresAt: number;
  sessionId: string;
}

export default function ReceiveMoney() {
  const { user } = usePrivy();
  const { createPayment, getCustomerPayments, getPayment, loading } =
    usePyLinksCore();
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [paymentRequest, setPaymentRequest] = useState<string>("");
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const [pendingPayments, setPendingPayments] = useState<PendingPayment[]>([]);

  useEffect(() => {
    loadPendingPayments();
  }, [user?.wallet?.address]);

  const loadPendingPayments = async () => {
    if (!user?.wallet?.address) return;

    try {
      // This would need to be implemented to get pending payments for the user
      // For now, we'll use mock data
      const mockPendingPayments: PendingPayment[] = [];
      setPendingPayments(mockPendingPayments);
    } catch (error) {
      console.error("Error loading pending payments:", error);
    }
  };

  const generatePaymentRequest = async () => {
    if (!amount || !description) {
      toast.error("Please enter amount and description");
      return;
    }

    if (parseFloat(amount) <= 0) {
      toast.error("Amount must be greater than 0");
      return;
    }

    if (!user?.wallet?.address) {
      toast.error("Wallet not connected");
      return;
    }

    try {
      const sessionId = `request_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;

      const request = {
        merchant: user.wallet.address,
        amount: amount,
        sessionId: sessionId,
        description: description,
        splits: [],
        isOneTime: true,
      };

      const txHash = await createPayment(request);

      if (txHash) {
        const paymentUrl = `${window.location.origin}/pay?session=${sessionId}`;
        setPaymentRequest(paymentUrl);

        // Generate QR code
        const qrCode = await QRCodeLib.toDataURL(paymentUrl, {
          width: 256,
          margin: 2,
          color: {
            dark: "#000000",
            light: "#FFFFFF",
          },
        });
        setQrCodeUrl(qrCode);

        toast.success("Payment request created successfully!");
      }
    } catch (error) {
      console.error("Generate payment request error:", error);
    }
  };

  const copyPaymentRequest = () => {
    navigator.clipboard.writeText(paymentRequest);
    toast.success("Payment request copied to clipboard!");
  };

  const copyWalletAddress = () => {
    if (user?.wallet?.address) {
      navigator.clipboard.writeText(user.wallet.address);
      toast.success("Wallet address copied to clipboard!");
    }
  };

  const sharePaymentRequest = async () => {
    if (navigator.share && paymentRequest) {
      try {
        await navigator.share({
          title: "PyLinks Payment Request",
          text: `Please pay ${amount} PYUSD for: ${description}`,
          url: paymentRequest,
        });
      } catch (error) {
        // Fallback to copy
        copyPaymentRequest();
      }
    } else {
      copyPaymentRequest();
    }
  };

  const downloadQRCode = () => {
    if (qrCodeUrl) {
      const link = document.createElement("a");
      link.download = `pylinks-payment-request-${Date.now()}.png`;
      link.href = qrCodeUrl;
      link.click();
    }
  };

  const calculateFee = () => {
    const amt = parseFloat(amount) || 0;
    return amt * 0.001; // 0.1% platform fee
  };

  const getTimeRemaining = (expiresAt: number) => {
    const now = Date.now() / 1000;
    const diff = expiresAt - now;

    if (diff <= 0) return "Expired";

    const minutes = Math.floor(diff / 60);
    const seconds = Math.floor(diff % 60);

    return `${minutes}m ${seconds}s`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Receive Money</h1>
        <p className="text-muted-foreground">
          Create payment requests or share your wallet address to receive PYUSD
        </p>
      </div>

      {/* Wallet Balance Display */}
      {/* <WalletBalance showHeader={true} compact={false} /> */}

      <Alert>
        <Wallet className="h-4 w-4" />
        <AlertDescription>
          Generate payment requests with QR codes for easy sharing, or share
          your wallet address for direct transfers. All payments are secured by
          smart contracts.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="request" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="request">Payment Request</TabsTrigger>
          <TabsTrigger value="address">Wallet Address</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
        </TabsList>

        <TabsContent value="request" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <QrCode className="h-5 w-5" />
                Create Payment Request
              </CardTitle>
              <CardDescription>
                Generate a payment request with QR code for easy sharing
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="request-amount">Amount (PYUSD)</Label>
                  <Input
                    id="request-amount"
                    type="number"
                    step="0.000001"
                    placeholder="25.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>You'll Receive</Label>
                  <div className="p-2 bg-muted rounded-md">
                    <span className="font-mono">
                      {amount
                        ? (parseFloat(amount) - calculateFee()).toFixed(6)
                        : "0.00"}{" "}
                      PYUSD
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="request-description">Description</Label>
                <Textarea
                  id="request-description"
                  placeholder="Payment for services, invoice #1234, etc."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </div>

              {amount && (
                <div className="bg-muted p-4 rounded-lg space-y-2">
                  <div className="flex justify-between">
                    <span>Requested Amount:</span>
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
                  <Separator />
                  <div className="flex justify-between font-semibold">
                    <span>You'll Receive:</span>
                    <span className="font-mono">
                      {(parseFloat(amount) - calculateFee()).toFixed(6)} PYUSD
                    </span>
                  </div>
                </div>
              )}

              <Button
                onClick={generatePaymentRequest}
                disabled={!amount || !description || loading}
                className="w-full"
              >
                {loading ? (
                  <>Generating...</>
                ) : (
                  <>
                    <QrCode className="h-4 w-4 mr-2" />
                    Generate Payment Request
                  </>
                )}
              </Button>

              {paymentRequest && (
                <Card className="bg-green-50 border-green-200">
                  <CardHeader>
                    <CardTitle className="text-green-800">
                      Payment Request Created!
                    </CardTitle>
                    <CardDescription className="text-green-600">
                      Share this with the payer
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {qrCodeUrl && (
                      <div className="flex justify-center">
                        <div className="p-4 bg-white rounded-lg border">
                          <img
                            src={qrCodeUrl}
                            alt="Payment QR Code"
                            className="w-48 h-48"
                          />
                        </div>
                      </div>
                    )}

                    <div className="p-3 bg-white border rounded-lg">
                      <p className="text-sm font-mono break-all">
                        {paymentRequest}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <Button onClick={copyPaymentRequest} variant="outline">
                        <Copy className="h-4 w-4 mr-2" />
                        Copy Link
                      </Button>
                      <Button onClick={sharePaymentRequest} variant="outline">
                        <Share className="h-4 w-4 mr-2" />
                        Share
                      </Button>
                      {qrCodeUrl && (
                        <>
                          <Button onClick={downloadQRCode} variant="outline">
                            <Download className="h-4 w-4 mr-2" />
                            Download QR
                          </Button>
                          <Button
                            onClick={() =>
                              window.open(paymentRequest, "_blank")
                            }
                            variant="outline"
                          >
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Open
                          </Button>
                        </>
                      )}
                    </div>

                    <Alert>
                      <Clock className="h-4 w-4" />
                      <AlertDescription>
                        This payment request will expire in 10 minutes. The
                        payer must complete it before then.
                      </AlertDescription>
                    </Alert>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="address" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5" />
                Your Wallet Address
              </CardTitle>
              <CardDescription>
                Share your wallet address for direct PYUSD transfers
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Wallet Address</Label>
                <div className="flex gap-2">
                  <Input
                    value={user?.wallet?.address || ""}
                    readOnly
                    className="font-mono"
                  />
                  <Button
                    onClick={copyWalletAddress}
                    variant="outline"
                    size="icon"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <Alert>
                <DollarSign className="h-4 w-4" />
                <AlertDescription>
                  Anyone can send PYUSD directly to this address. Direct
                  transfers bypass the payment system and don't include platform
                  fees or expiration times.
                </AlertDescription>
              </Alert>

              <div className="bg-muted p-4 rounded-lg">
                <h4 className="font-semibold mb-2">Supported Tokens</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span>PYUSD (PayPal USD)</span>
                    <Badge variant="outline">Primary</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>ETH (Ethereum)</span>
                    <Badge variant="secondary">Supported</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pending" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Pending Payments
              </CardTitle>
              <CardDescription>
                Payment requests waiting to be fulfilled
              </CardDescription>
            </CardHeader>
            <CardContent>
              {pendingPayments.length === 0 ? (
                <div className="text-center py-12">
                  <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    No pending payment requests
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Create a payment request to get started
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Amount</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Expires In</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingPayments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell className="font-mono">
                          {parseFloat(payment.amount).toFixed(6)} PYUSD
                        </TableCell>
                        <TableCell>{payment.description}</TableCell>
                        <TableCell>
                          {new Date(payment.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {getTimeRemaining(payment.expiresAt)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            <Clock className="h-3 w-3 mr-1" />
                            Pending
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
