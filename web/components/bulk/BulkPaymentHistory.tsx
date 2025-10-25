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
  Users,
  Filter
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
import { BulkBatchDetails } from "@/lib/contracts/pylinks-core";
import { toast } from "sonner";

interface BulkBatchWithDetails extends BulkBatchDetails {
  paymentIds: number[];
}

export default function BulkPaymentHistory() {
  const { user } = usePrivy();
  const { getCustomerBulkBatches, getBulkBatch, getBulkBatchPayments, loading } = usePyLinksCore();
  const [batches, setBatches] = useState<BulkBatchWithDetails[]>([]);
  const [filteredBatches, setFilteredBatches] = useState<BulkBatchWithDetails[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<BulkBatchWithDetails | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadBulkBatches();
  }, [user?.wallet?.address]);

  useEffect(() => {
    filterBatches();
  }, [batches, searchTerm, statusFilter]);

  const loadBulkBatches = async () => {
    if (!user?.wallet?.address) return;

    try {
      setIsLoading(true);
      const batchIds = await getCustomerBulkBatches(user.wallet.address);
      
      const batchDetails = await Promise.all(
        batchIds.map(async (batchId) => {
          const batch = await getBulkBatch(batchId);
          const paymentIds = await getBulkBatchPayments(batchId);
          
          if (batch) {
            return {
              ...batch,
              paymentIds
            };
          }
          return null;
        })
      );

      const validBatches = batchDetails.filter(Boolean) as BulkBatchWithDetails[];
      setBatches(validBatches.sort((a, b) => b.createdAt - a.createdAt));
    } catch (error) {
      console.error("Error loading bulk batches:", error);
      toast.error("Failed to load bulk payment history");
    } finally {
      setIsLoading(false);
    }
  };

  const filterBatches = () => {
    let filtered = batches;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(batch => 
        batch.id.toString().includes(searchTerm) ||
        batch.customer.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by status
    if (statusFilter !== "all") {
      filtered = filtered.filter(batch => {
        if (statusFilter === "processed") return batch.processed;
        if (statusFilter === "pending") return !batch.processed;
        return true;
      });
    }

    setFilteredBatches(filtered);
  };

  const getStatusBadge = (processed: boolean) => {
    if (processed) {
      return <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Processed</Badge>;
    }
    return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
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
          <h1 className="text-3xl font-bold">Bulk Payment History</h1>
          <p className="text-muted-foreground">Loading your bulk payment batches...</p>
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
        <h1 className="text-3xl font-bold">Bulk Payment History</h1>
        <p className="text-muted-foreground">
          View and manage your bulk payment batches
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <div className="space-y-1">
                <p className="text-sm font-medium leading-none">Total Batches</p>
                <p className="text-2xl font-bold">{batches.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <div className="space-y-1">
                <p className="text-sm font-medium leading-none">Processed</p>
                <p className="text-2xl font-bold">{batches.filter(b => b.processed).length}</p>
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
                <p className="text-2xl font-bold">{batches.filter(b => !b.processed).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4 text-blue-600" />
              <div className="space-y-1">
                <p className="text-sm font-medium leading-none">Total Payments</p>
                <p className="text-2xl font-bold">
                  {batches.reduce((sum, batch) => sum + batch.paymentCount, 0)}
                </p>
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
              <Input
                id="search"
                placeholder="Search by batch ID or address..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="w-full sm:w-48">
              <Label htmlFor="status">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="processed">Processed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Batch History Table */}
      <Card>
        <CardHeader>
          <CardTitle>Bulk Payment Batches</CardTitle>
          <CardDescription>
            {filteredBatches.length} of {batches.length} batches
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredBatches.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No bulk payment batches found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Batch ID</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Payments</TableHead>
                  <TableHead>Total Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBatches.map((batch) => (
                  <TableRow key={batch.id}>
                    <TableCell className="font-mono">#{batch.id}</TableCell>
                    <TableCell>{formatDate(batch.createdAt)}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{batch.paymentCount}</Badge>
                    </TableCell>
                    <TableCell className="font-mono">
                      {formatAmount(batch.totalAmount)} PYUSD
                    </TableCell>
                    <TableCell>{getStatusBadge(batch.processed)}</TableCell>
                    <TableCell>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => setSelectedBatch(batch)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Batch #{batch.id} Details</DialogTitle>
                            <DialogDescription>
                              Bulk payment batch information and payment breakdown
                            </DialogDescription>
                          </DialogHeader>
                          
                          {selectedBatch && (
                            <div className="space-y-6">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <Label>Batch ID</Label>
                                  <p className="font-mono">#{selectedBatch.id}</p>
                                </div>
                                <div>
                                  <Label>Status</Label>
                                  <div className="mt-1">
                                    {getStatusBadge(selectedBatch.processed)}
                                  </div>
                                </div>
                                <div>
                                  <Label>Created</Label>
                                  <p>{formatDate(selectedBatch.createdAt)}</p>
                                </div>
                                <div>
                                  <Label>Payment Count</Label>
                                  <p>{selectedBatch.paymentCount}</p>
                                </div>
                              </div>
                              
                              <Separator />
                              
                              <div className="space-y-2">
                                <Label>Financial Summary</Label>
                                <div className="bg-muted p-4 rounded-lg space-y-2">
                                  <div className="flex justify-between">
                                    <span>Total Amount:</span>
                                    <span className="font-mono">{formatAmount(selectedBatch.totalAmount)} PYUSD</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Platform Fees:</span>
                                    <span className="font-mono">{formatAmount(selectedBatch.totalFees)} PYUSD</span>
                                  </div>
                                  <Separator />
                                  <div className="flex justify-between font-semibold">
                                    <span>Net Amount:</span>
                                    <span className="font-mono">
                                      {formatAmount((parseFloat(selectedBatch.totalAmount) - parseFloat(selectedBatch.totalFees)).toString())} PYUSD
                                    </span>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="space-y-2">
                                <Label>Payment IDs</Label>
                                <div className="flex flex-wrap gap-2">
                                  {selectedBatch.paymentIds.map((paymentId) => (
                                    <Badge key={paymentId} variant="outline" className="font-mono">
                                      #{paymentId}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
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
