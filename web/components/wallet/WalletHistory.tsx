"use client";

import { useState, useEffect } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { 
  ArrowUpRight, 
  ArrowDownLeft, 
  Clock, 
  CheckCircle, 
  XCircle,
  Filter,
  Search,
  ExternalLink,
  Download
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
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

interface Transaction {
  id: string;
  type: "sent" | "received" | "fee";
  amount: string;
  from: string;
  to: string;
  timestamp: Date;
  status: "completed" | "pending" | "failed";
  txHash: string;
  description?: string;
}

export default function WalletHistory() {
  const { user } = usePrivy();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  // Mock transaction data
  useEffect(() => {
    const mockTransactions: Transaction[] = [
      {
        id: "1",
        type: "received",
        amount: "25.000000",
        from: "0x123d35Cc6634C0532925a3b8D9C9C0532925a3b8",
        to: user?.wallet?.address || "",
        timestamp: new Date(Date.now() - 1000 * 60 * 30),
        status: "completed",
        txHash: "0xabc123def456...",
        description: "Payment received from customer"
      },
      {
        id: "2",
        type: "sent",
        amount: "10.500000",
        from: user?.wallet?.address || "",
        to: "0x456d35Cc6634C0532925a3b8D9C9C0532925a3b8",
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
        status: "completed",
        txHash: "0xdef456ghi789...",
        description: "Bulk payment to merchant"
      },
      {
        id: "3",
        type: "fee",
        amount: "0.001000",
        from: user?.wallet?.address || "",
        to: "0x000000000000000000000000000000000000dead",
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
        status: "completed",
        txHash: "0xdef456ghi789...",
        description: "Platform fee"
      },
      {
        id: "4",
        type: "sent",
        amount: "50.000000",
        from: user?.wallet?.address || "",
        to: "0x789d35Cc6634C0532925a3b8D9C9C0532925a3b8",
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24),
        status: "pending",
        txHash: "0xghi789jkl012...",
        description: "Escrow payment"
      },
      {
        id: "5",
        type: "received",
        amount: "100.000000",
        from: "0xabcd35Cc6634C0532925a3b8D9C9C0532925a3b8",
        to: user?.wallet?.address || "",
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2),
        status: "completed",
        txHash: "0xjkl012mno345...",
        description: "Large payment received"
      }
    ];

    setTransactions(mockTransactions);
    setLoading(false);
  }, [user?.wallet?.address]);

  useEffect(() => {
    filterTransactions();
  }, [transactions, searchTerm, typeFilter, statusFilter]);

  const filterTransactions = () => {
    let filtered = transactions;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(tx => 
        tx.id.includes(searchTerm) ||
        tx.txHash.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tx.from.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tx.to.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tx.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by type
    if (typeFilter !== "all") {
      filtered = filtered.filter(tx => tx.type === typeFilter);
    }

    // Filter by status
    if (statusFilter !== "all") {
      filtered = filtered.filter(tx => tx.status === statusFilter);
    }

    setFilteredTransactions(filtered);
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "sent": return <ArrowUpRight className="h-4 w-4 text-red-600" />;
      case "received": return <ArrowDownLeft className="h-4 w-4 text-green-600" />;
      case "fee": return <Clock className="h-4 w-4 text-gray-600" />;
      default: return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed": return <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Completed</Badge>;
      case "pending": return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case "failed": return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Failed</Badge>;
      default: return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  const formatDate = (timestamp: Date) => {
    return timestamp.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatAmount = (amount: string, type: string) => {
    const sign = type === "sent" || type === "fee" ? "-" : "+";
    const color = type === "sent" || type === "fee" ? "text-red-600" : "text-green-600";
    return (
      <span className={`font-mono ${color}`}>
        {sign}{parseFloat(amount).toFixed(6)} PYUSD
      </span>
    );
  };

  const exportTransactions = () => {
    const csvContent = [
      ["Date", "Type", "Amount", "From", "To", "Status", "Transaction Hash", "Description"],
      ...filteredTransactions.map(tx => [
        formatDate(tx.timestamp),
        tx.type,
        tx.amount,
        tx.from,
        tx.to,
        tx.status,
        tx.txHash,
        tx.description || ""
      ])
    ].map(row => row.join(",")).join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "wallet-history.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Transaction history exported!");
  };

  const getTotalBalance = () => {
    return transactions.reduce((total, tx) => {
      if (tx.status !== "completed") return total;
      const amount = parseFloat(tx.amount);
      if (tx.type === "received") return total + amount;
      if (tx.type === "sent" || tx.type === "fee") return total - amount;
      return total;
    }, 0);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Wallet History</h1>
          <p className="text-muted-foreground">Loading your transaction history...</p>
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
          <h1 className="text-3xl font-bold">Wallet History</h1>
          <p className="text-muted-foreground">
            View all your PYUSD transactions and wallet activity
          </p>
        </div>
        <Button onClick={exportTransactions} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <ArrowDownLeft className="h-4 w-4 text-green-600" />
              <div className="space-y-1">
                <p className="text-sm font-medium leading-none">Total Received</p>
                <p className="text-2xl font-bold text-green-600">
                  {transactions
                    .filter(tx => tx.type === "received" && tx.status === "completed")
                    .reduce((sum, tx) => sum + parseFloat(tx.amount), 0)
                    .toFixed(6)} PYUSD
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <ArrowUpRight className="h-4 w-4 text-red-600" />
              <div className="space-y-1">
                <p className="text-sm font-medium leading-none">Total Sent</p>
                <p className="text-2xl font-bold text-red-600">
                  {transactions
                    .filter(tx => tx.type === "sent" && tx.status === "completed")
                    .reduce((sum, tx) => sum + parseFloat(tx.amount), 0)
                    .toFixed(6)} PYUSD
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-gray-600" />
              <div className="space-y-1">
                <p className="text-sm font-medium leading-none">Total Fees</p>
                <p className="text-2xl font-bold text-gray-600">
                  {transactions
                    .filter(tx => tx.type === "fee" && tx.status === "completed")
                    .reduce((sum, tx) => sum + parseFloat(tx.amount), 0)
                    .toFixed(6)} PYUSD
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-blue-600" />
              <div className="space-y-1">
                <p className="text-sm font-medium leading-none">Net Balance</p>
                <p className={`text-2xl font-bold ${getTotalBalance() >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {getTotalBalance().toFixed(6)} PYUSD
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
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search by address, hash, or description..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-full sm:w-48">
              <Label htmlFor="type">Transaction Type</Label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="received">Received</SelectItem>
                  <SelectItem value="fee">Fees</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-full sm:w-48">
              <Label htmlFor="status">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transaction History Table */}
      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
          <CardDescription>
            {filteredTransactions.length} of {transactions.length} transactions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredTransactions.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">No transactions found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>From/To</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getTransactionIcon(transaction.type)}
                        <span className="capitalize">{transaction.type}</span>
                      </div>
                    </TableCell>
                    <TableCell>{formatDate(transaction.timestamp)}</TableCell>
                    <TableCell>{formatAmount(transaction.amount, transaction.type)}</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {transaction.type === "sent" || transaction.type === "fee" ? (
                          <>
                            <p className="text-xs text-muted-foreground">To:</p>
                            <p className="font-mono text-sm">{formatAddress(transaction.to)}</p>
                          </>
                        ) : (
                          <>
                            <p className="text-xs text-muted-foreground">From:</p>
                            <p className="font-mono text-sm">{formatAddress(transaction.from)}</p>
                          </>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(transaction.status)}</TableCell>
                    <TableCell>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => window.open(`https://etherscan.io/tx/${transaction.txHash}`, '_blank')}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
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
