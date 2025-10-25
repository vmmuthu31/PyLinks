"use client";

import { useState } from "react";
import { Plus, Trash2, Send, Users, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { usePyLinksCore } from "@/hooks/usePyLinksCore";
import { toast } from "sonner";
import { BulkPaymentRequest } from "@/lib/contracts/pylinks-core";

interface PaymentRequest {
  id: string;
  merchant: string;
  amount: string;
  description: string;
}

export default function BulkPayMultipleMerchants() {
  const { bulkPayMultipleMerchants, loading } = usePyLinksCore();
  const [paymentRequests, setPaymentRequests] = useState<PaymentRequest[]>([
    { id: "1", merchant: "", amount: "", description: "" }
  ]);
  const [csvData, setCsvData] = useState("");

  const addPaymentRequest = () => {
    const newId = (paymentRequests.length + 1).toString();
    setPaymentRequests([...paymentRequests, { 
      id: newId, 
      merchant: "", 
      amount: "", 
      description: "" 
    }]);
  };

  const removePaymentRequest = (id: string) => {
    if (paymentRequests.length > 1) {
      setPaymentRequests(paymentRequests.filter(req => req.id !== id));
    }
  };

  const updatePaymentRequest = (id: string, field: keyof PaymentRequest, value: string) => {
    setPaymentRequests(paymentRequests.map(req => 
      req.id === id ? { ...req, [field]: value } : req
    ));
  };

  const parseCsvData = () => {
    if (!csvData.trim()) {
      toast.error("Please enter CSV data");
      return;
    }

    try {
      const lines = csvData.trim().split('\n');
      const newRequests: PaymentRequest[] = [];

      lines.forEach((line, index) => {
        const [merchant, amount, description] = line.split(',').map(s => s.trim());
        
        if (merchant && amount && description) {
          newRequests.push({
            id: (index + 1).toString(),
            merchant,
            amount,
            description
          });
        }
      });

      if (newRequests.length > 0) {
        setPaymentRequests(newRequests);
        toast.success(`Imported ${newRequests.length} payment requests`);
      } else {
        toast.error("No valid payment requests found in CSV data");
      }
    } catch (error) {
      toast.error("Error parsing CSV data");
    }
  };

  const calculateTotal = () => {
    return paymentRequests.reduce((total, req) => {
      const amount = parseFloat(req.amount) || 0;
      return total + amount;
    }, 0);
  };

  const calculateFees = () => {
    const total = calculateTotal();
    return total * 0.001; // 0.1% platform fee
  };

  const getUniqueMerchants = () => {
    const merchants = new Set(paymentRequests.map(req => req.merchant).filter(Boolean));
    return merchants.size;
  };

  const handleSubmit = async () => {
    const validRequests = paymentRequests.filter(req => 
      req.merchant && req.amount && parseFloat(req.amount) > 0 && req.description.trim()
    );

    if (validRequests.length === 0) {
      toast.error("Please add at least one valid payment request");
      return;
    }

    try {
      const requests: BulkPaymentRequest[] = validRequests.map(req => ({
        merchant: req.merchant,
        amount: req.amount,
        description: req.description
      }));

      const result = await bulkPayMultipleMerchants(requests);
      
      if (result) {
        toast.success(`Bulk payment batch created! Batch ID: ${result.batchId}`);
        // Reset form
        setPaymentRequests([{ id: "1", merchant: "", amount: "", description: "" }]);
        setCsvData("");
      }
    } catch (error) {
      console.error("Bulk payment error:", error);
    }
  };

  const isFormValid = () => {
    return paymentRequests.some(req => 
      req.merchant && req.amount && parseFloat(req.amount) > 0 && req.description.trim()
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Bulk Pay Multiple Merchants</h1>
        <p className="text-muted-foreground">
          Send payments to multiple merchants in a single transaction
        </p>
      </div>

      <Alert>
        <Users className="h-4 w-4" />
        <AlertDescription>
          Perfect for marketplace payouts, revenue sharing, or paying multiple vendors. 
          Each merchant receives their payment automatically with optimized gas costs.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="manual" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="manual">Manual Entry</TabsTrigger>
          <TabsTrigger value="csv">CSV Import</TabsTrigger>
        </TabsList>

        <TabsContent value="manual" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Payment Requests</CardTitle>
                <CardDescription>
                  Add payments for different merchants
                </CardDescription>
              </div>
              <Button onClick={addPaymentRequest} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Payment
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {paymentRequests.map((request, index) => (
                <div key={request.id} className="p-4 border rounded-lg space-y-4">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline">Payment #{index + 1}</Badge>
                    {paymentRequests.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removePaymentRequest(request.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor={`merchant-${request.id}`}>Merchant Address</Label>
                      <Input
                        id={`merchant-${request.id}`}
                        placeholder="0x742d35Cc..."
                        value={request.merchant}
                        onChange={(e) => updatePaymentRequest(request.id, "merchant", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`amount-${request.id}`}>Amount (PYUSD)</Label>
                      <Input
                        id={`amount-${request.id}`}
                        type="number"
                        step="0.000001"
                        placeholder="25.00"
                        value={request.amount}
                        onChange={(e) => updatePaymentRequest(request.id, "amount", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`description-${request.id}`}>Description</Label>
                      <Input
                        id={`description-${request.id}`}
                        placeholder="Payment for services"
                        value={request.description}
                        onChange={(e) => updatePaymentRequest(request.id, "description", e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="csv" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>CSV Import</CardTitle>
              <CardDescription>
                Import payment data in CSV format: merchant_address, amount, description
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="csv-data">CSV Data</Label>
                <Textarea
                  id="csv-data"
                  placeholder="0x742d35Cc6634C0532925a3b8D9C9C0532925a3b8, 25.00, Payment for services&#10;0x123..., 50.00, Monthly subscription&#10;0x456..., 10.00, Referral bonus"
                  value={csvData}
                  onChange={(e) => setCsvData(e.target.value)}
                  rows={8}
                />
              </div>
              <Button onClick={parseCsvData} variant="outline">
                <Upload className="h-4 w-4 mr-2" />
                Parse CSV Data
              </Button>
              
              {paymentRequests.length > 1 && (
                <Alert>
                  <AlertDescription>
                    Successfully parsed {paymentRequests.length} payment requests
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle>Payment Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{paymentRequests.length}</div>
              <div className="text-sm text-muted-foreground">Total Payments</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{getUniqueMerchants()}</div>
              <div className="text-sm text-muted-foreground">Unique Merchants</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{calculateTotal().toFixed(2)}</div>
              <div className="text-sm text-muted-foreground">Total PYUSD</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{calculateFees().toFixed(6)}</div>
              <div className="text-sm text-muted-foreground">Platform Fees</div>
            </div>
          </div>
          
          <Separator />
          
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
              Send Bulk Payments
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
