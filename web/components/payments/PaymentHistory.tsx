"use client";

import { useState, useEffect } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  Eye, 
  ExternalLink,
  Calendar,
  DollarSign,
  Filter,
  Search
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { usePyLinksCore } from "@/hooks/usePyLinksCore";
import { PaymentDetails } from "@/lib/contracts/pylinks-core";
import { toast } from "sonner";

export default function PaymentHistory() {
  const { user } = usePrivy();
  const { getMerchantPayments, getPayment, loading } = usePyLinksCore();
  const [payments, setPayments] = useState<PaymentDetails[]>([]);
  const [filteredPayments, setFilteredPayments] = useState<PaymentDetails[]>([]);
  const [selectedPayment, setSelectedPayment] = useState<PaymentDetails | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadPayments();
  }, [user?.wallet?.address]);

  useEffect(() => {
    filterPayments();
  }, [payments, searchTerm, statusFilter, typeFilter]);

  const loadPayments = async () => {
    if (!user?.wallet?.address) return;

    try {
      setIsLoading(true);
      const paymentIds = await getMerchantPayments(user.wallet.address);
      
      const paymentDetails = await Promise.all(
        paymentIds.map(async (paymentId: number) => {
          const payment = await getPayment(paymentId);
          return payment;
        })
      );

      const validPayments = paymentDetails.filter(Boolean) as PaymentDetails[];
      setPayments(validPayments.sort((a, b) => b.createdAt - a.createdAt));
    } catch (error) {
      console.error("Error loading payments:", error);
      toast.error("Failed to load payment history");
    } finally {
      setIsLoading(false);
    }
  };

  const filterPayments = () => {
    let filtered = payments;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(payment => 
        payment.id.toString().includes(searchTerm) ||
        payment.sessionId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.customer.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by status
    if (statusFilter !== "all") {
      filtered = filtered.filter(payment => {
        if (statusFilter === "paid") return payment.status === 1;
        if (statusFilter === "pending") return payment.status === 0;
        if (statusFilter === "expired") return payment.status === 2;
        if (statusFilter === "escrowed") return payment.status === 5;
        return true;
      });
    }

    // Filter by type
    if (typeFilter !== "all") {
      filtered = filtered.filter(payment => {
        if (typeFilter === "regular") return payment.paymentType === 0;
        if (typeFilter === "escrow") return payment.paymentType === 1;
        if (typeFilter === "subscription") return payment.paymentType === 2;
        if (typeFilter === "bulk") return payment.paymentType === 3;
        return true;
      });
    }

    setFilteredPayments(filtered);
  };

  const getStatusBadge = (status: number) => {
    switch (status) {
      case 0: return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 1: return <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Paid</Badge>;
      case 2: return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Expired</Badge>;
      case 5: return <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />Escrowed</Badge>;
      default: return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  const getTypeBadge = (type: number) => {
    switch (type) {
      case 0: return <Badge variant="outline">Regular</Badge>;
      case 1: return <Badge variant="outline">Escrow</Badge>;
      case 2: return <Badge variant="outline">Subscription</Badge>;
      case 3: return <Badge variant="outline">Bulk</Badge>;
      default: return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatAmount = (amount: string) => {
    return parseFloat(amount).toFixed(6);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Payment History</h1>
          <p className="text-muted-foreground">Loading your payment history...</p>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Payment History</h1>
        <p className="text-muted-foreground">
          View and manage all your payment requests
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <div className="space-y-1">
                <p className="text-sm font-medium leading-none">Total Payments</p>
                <p className="text-2xl font-bold">{payments.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <div className="space-y-1">
                <p className="text-sm font-medium leading-none">Paid</p>
                <p className="text-2xl font-bold">{payments.filter(p => p.status === 1).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-yellow-600" />
              <div className="space-y-1">
                <p className="text-sm font-medium leading-none">Pending</p>
                <p className="text-2xl font-bold">{payments.filter(p => p.status === 0).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <XCircle className="h-4 w-4 text-red-600" />
              <div className="space-y-1">
                <p className="text-sm font-medium leading-none">Expired</p>
                <p className="text-2xl font-bold">{payments.filter(p => p.status === 2).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search by ID, session, or customer..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-full sm:w-48">
              <Label htmlFor="status">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                  <SelectItem value="escrowed">Escrowed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-full sm:w-48">
              <Label htmlFor="type">Type</Label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="regular">Regular</SelectItem>
                  <SelectItem value="escrow">Escrow</SelectItem>
                  <SelectItem value="subscription">Subscription</SelectItem>
                  <SelectItem value="bulk">Bulk</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment History Table */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Requests</CardTitle>
          <CardDescription>
            {filteredPayments.length} of {payments.length} payments
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredPayments.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No payments found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Payment ID</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPayments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="font-mono">#{payment.id}</TableCell>
                    <TableCell>{formatDate(payment.createdAt)}</TableCell>
                    <TableCell className="font-mono">
                      {formatAmount(payment.amount)} PYUSD
                    </TableCell>
                    <TableCell className="font-mono">
                      {payment.customer ? 
                        `${payment.customer.slice(0, 6)}...${payment.customer.slice(-4)}` : 
                        "Not paid"
                      }
                    </TableCell>
                    <TableCell>{getTypeBadge(payment.paymentType)}</TableCell>
                    <TableCell>{getStatusBadge(payment.status)}</TableCell>
                    <TableCell>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => setSelectedPayment(payment)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Payment #{payment.id} Details</DialogTitle>
                            <DialogDescription>
                              Complete payment information and transaction details
                            </DialogDescription>
                          </DialogHeader>
                          
                          {selectedPayment && (
                            <div className="space-y-6">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <Label>Payment ID</Label>
                                  <p className="font-mono">#{selectedPayment.id}</p>
                                </div>
                                <div>
                                  <Label>Session ID</Label>
                                  <p className="font-mono text-sm">{selectedPayment.sessionId}</p>
                                </div>
                                <div>
                                  <Label>Status</Label>
                                  <div className="mt-1">
                                    {getStatusBadge(selectedPayment.status)}
                                  </div>
                                </div>
                                <div>
                                  <Label>Type</Label>
                                  <div className="mt-1">
                                    {getTypeBadge(selectedPayment.paymentType)}
                                  </div>
                                </div>
                                <div>
                                  <Label>Created</Label>
                                  <p>{formatDate(selectedPayment.createdAt)}</p>
                                </div>
                                <div>
                                  <Label>Expires</Label>
                                  <p>{formatDate(selectedPayment.expiresAt)}</p>
                                </div>
                              </div>
                              
                              <Separator />
                              
                              <div className="space-y-2">
                                <Label>Financial Details</Label>
                                <div className="bg-muted p-4 rounded-lg space-y-2">
                                  <div className="flex justify-between">
                                    <span>Amount:</span>
                                    <span className="font-mono">{formatAmount(selectedPayment.amount)} PYUSD</span>
                                  </div>
                                </div>
                              </div>
                              
                              {selectedPayment.customer && (
                                <div className="space-y-2">
                                  <Label>Customer</Label>
                                  <div className="p-3 bg-muted rounded-lg">
                                    <p className="font-mono text-sm">{selectedPayment.customer}</p>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
