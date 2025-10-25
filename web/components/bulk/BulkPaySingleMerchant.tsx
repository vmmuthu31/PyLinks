"use client";

import { useState } from "react";
import { Plus, Trash2, Send, Calculator } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { usePyLinksCore } from "@/hooks/usePyLinksCore";
import { toast } from "sonner";
import { PyLinksCoreService } from "@/lib/contracts/pylinks-core";

interface PaymentItem {
  id: string;
  amount: string;
  description: string;
}

export default function BulkPaySingleMerchant() {
  const { bulkPaySingleMerchant, loading } = usePyLinksCore();
  const [merchantAddress, setMerchantAddress] = useState("");
  const [paymentItems, setPaymentItems] = useState<PaymentItem[]>([
    { id: "1", amount: "", description: "" }
  ]);

  const addPaymentItem = () => {
    const newId = (paymentItems.length + 1).toString();
    setPaymentItems([...paymentItems, { id: newId, amount: "", description: "" }]);
  };

  const removePaymentItem = (id: string) => {
    if (paymentItems.length > 1) {
      setPaymentItems(paymentItems.filter(item => item.id !== id));
    }
  };

  const updatePaymentItem = (id: string, field: keyof PaymentItem, value: string) => {
    setPaymentItems(paymentItems.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const calculateTotal = () => {
    return paymentItems.reduce((total, item) => {
      const amount = parseFloat(item.amount) || 0;
      return total + amount;
    }, 0);
  };

  const calculateFees = () => {
    const total = calculateTotal();
    return total * 0.001; // 0.1% platform fee
  };

  const handleSubmit = async () => {
    if (!merchantAddress) {
      toast.error("Please enter merchant address");
      return;
    }

    const validItems = paymentItems.filter(item => 
      item.amount && parseFloat(item.amount) > 0 && item.description.trim()
    );

    if (validItems.length === 0) {
      toast.error("Please add at least one valid payment");
      return;
    }

    try {
      const request = {
        merchant: merchantAddress,
        amounts: validItems.map(item => item.amount),
        descriptions: validItems.map(item => item.description)
      };

      const result = await bulkPaySingleMerchant(request);
      
      if (result) {
        toast.success(`Bulk payment batch created! Batch ID: ${result.batchId}`);
        // Reset form
        setMerchantAddress("");
        setPaymentItems([{ id: "1", amount: "", description: "" }]);
      }
    } catch (error) {
      console.error("Bulk payment error:", error);
    }
  };

  const isFormValid = () => {
    return merchantAddress && 
           paymentItems.some(item => item.amount && parseFloat(item.amount) > 0 && item.description.trim());
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Bulk Pay Single Merchant</h1>
        <p className="text-muted-foreground">
          Send multiple payments to one merchant in a single transaction
        </p>
      </div>

      <Alert>
        <Calculator className="h-4 w-4" />
        <AlertDescription>
          Perfect for payroll, multiple invoices, or recurring payments to the same recipient. 
          All payments are processed atomically with a single gas fee.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Merchant Information</CardTitle>
          <CardDescription>
            Enter the recipient's wallet address
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="merchant">Merchant Address</Label>
            <Input
              id="merchant"
              placeholder="0x742d35Cc6634C0532925a3b8D9C9C0532925a3b8"
              value={merchantAddress}
              onChange={(e) => setMerchantAddress(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Payment Items</CardTitle>
            <CardDescription>
              Add multiple payments for this merchant
            </CardDescription>
          </div>
          <Button onClick={addPaymentItem} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Payment
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {paymentItems.map((item, index) => (
            <div key={item.id} className="p-4 border rounded-lg space-y-4">
              <div className="flex items-center justify-between">
                <Badge variant="outline">Payment #{index + 1}</Badge>
                {paymentItems.length > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removePaymentItem(item.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor={`amount-${item.id}`}>Amount (PYUSD)</Label>
                  <Input
                    id={`amount-${item.id}`}
                    type="number"
                    step="0.000001"
                    placeholder="25.00"
                    value={item.amount}
                    onChange={(e) => updatePaymentItem(item.id, "amount", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`description-${item.id}`}>Description</Label>
                  <Input
                    id={`description-${item.id}`}
                    placeholder="Invoice #1001"
                    value={item.description}
                    onChange={(e) => updatePaymentItem(item.id, "description", e.target.value)}
                  />
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Payment Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between items-center">
            <span>Total Payments:</span>
            <Badge variant="outline">{paymentItems.length}</Badge>
          </div>
          <div className="flex justify-between items-center">
            <span>Subtotal:</span>
            <span className="font-mono">{calculateTotal().toFixed(6)} PYUSD</span>
          </div>
          <div className="flex justify-between items-center text-sm text-muted-foreground">
            <span>Platform Fee (0.1%):</span>
            <span className="font-mono">{calculateFees().toFixed(6)} PYUSD</span>
          </div>
          <Separator />
          <div className="flex justify-between items-center font-semibold">
            <span>Total Amount:</span>
            <span className="font-mono">{calculateTotal().toFixed(6)} PYUSD</span>
          </div>
          <div className="flex justify-between items-center text-sm text-muted-foreground">
            <span>Merchant Receives:</span>
            <span className="font-mono">{(calculateTotal() - calculateFees()).toFixed(6)} PYUSD</span>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-4">
        <Button
          onClick={handleSubmit}
          disabled={!isFormValid() || loading}
          className="flex-1"
        >
          {loading ? (
            <>Processing...</>
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              Send Bulk Payment
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
