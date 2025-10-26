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
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
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

// Moralis API types
interface MoralisTransaction {
  hash: string;
  nonce: string;
  transaction_index: string;
  from_address: string;
  from_address_label?: string;
  to_address: string;
  to_address_label?: string;
  value: string;
  gas: string;
  gas_price: string;
  input: string;
  receipt_gas_used: string;
  receipt_status: string;
  block_timestamp: string;
  block_number: string;
  transaction_fee: string;
}

interface MoralisWalletHistory {
  hash: string;
  from_address: string;
  from_address_label?: string;
  to_address: string;
  to_address_label?: string;
  value: string;
  block_timestamp: string;
  block_number: string;
  transaction_fee: string;
  category: string;
  method_label?: string;
  summary?: string;
  possible_spam: string;
  erc20_transfers?: Array<{
    token_name: string;
    token_symbol: string;
    token_logo?: string;
    value_formatted: string;
    from_address: string;
    to_address: string;
  }>;
  native_transfers?: Array<{
    from_address: string;
    to_address: string;
    value_formatted: string;
    direction: string;
    token_symbol: string;
  }>;
}

interface MoralisResponse<T> {
  cursor?: string;
  page_size: number;
  page: number;
  result: T[];
}
import { toast } from "sonner";
import { ethers } from "ethers";

export default function PaymentHistory() {
  const { user } = usePrivy();
  const { getMerchantPayments, getCustomerPayments, getPayment, loading } =
    usePyLinksCore();
  const [walletHistory, setWalletHistory] = useState<MoralisWalletHistory[]>(
    []
  );
  const [nativeTransactions, setNativeTransactions] = useState<
    MoralisTransaction[]
  >([]);
  const [filteredTransactions, setFilteredTransactions] = useState<
    (MoralisWalletHistory | MoralisTransaction)[]
  >([]);
  const [selectedTransaction, setSelectedTransaction] = useState<
    MoralisWalletHistory | MoralisTransaction | null
  >(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all"); // all, history, native
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadTransactionHistory();
  }, [user?.wallet?.address]);

  useEffect(() => {
    filterTransactions();
  }, [walletHistory, nativeTransactions, searchTerm, typeFilter]);

  const loadTransactionHistory = async () => {
    if (!user?.wallet?.address) {
      console.log("⚠️ No wallet address found for transaction history");
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      console.log("🔍 Loading transaction history for:", user.wallet.address);

      const apiKey = process.env.NEXT_PUBLIC_MORALIS_API_KEY;
      if (!apiKey) {
        console.error("❌ Moralis API key not found");
        toast.error("API configuration error");
        return;
      }

      const options = {
        method: "GET",
        headers: {
          accept: "application/json",
          "X-API-Key": apiKey,
        },
      };

      // Load native transactions only (wallet history endpoint doesn't support Sepolia)
      const transactionsResponse = await fetch(
        `https://deep-index.moralis.io/api/v2.2/${user.wallet.address}?chain=sepolia&order=DESC&limit=25`,
        options
      );

      if (!transactionsResponse.ok) {
        throw new Error("Failed to fetch transaction data");
      }

      const transactionsData: MoralisResponse<MoralisTransaction> =
        await transactionsResponse.json();

      console.log("📊 Native Transactions:", transactionsData.result);

      // Clear wallet history since the API doesn't support Sepolia
      setWalletHistory([]);
      setNativeTransactions(transactionsData.result || []);
    } catch (error) {
      console.error("❌ Error loading transaction history:", error);
      toast.error("Failed to load transaction history");
    } finally {
      setIsLoading(false);
    }
  };

  const filterTransactions = () => {
    let allTransactions: (MoralisWalletHistory | MoralisTransaction)[] = [];

    // Since wallet history is not supported on Sepolia, only show native transactions
    allTransactions = nativeTransactions;

    // Filter by search term
    if (searchTerm) {
      allTransactions = allTransactions.filter((tx) => {
        const hash = tx.hash?.toLowerCase() || "";
        const fromAddress = tx.from_address?.toLowerCase() || "";
        const toAddress = tx.to_address?.toLowerCase() || "";
        const fromLabel = tx.from_address_label?.toLowerCase() || "";
        const toLabel = tx.to_address_label?.toLowerCase() || "";
        const search = searchTerm.toLowerCase();

        return (
          hash.includes(search) ||
          fromAddress.includes(search) ||
          toAddress.includes(search) ||
          fromLabel.includes(search) ||
          toLabel.includes(search)
        );
      });
    }

    // Sort by block timestamp (newest first)
    allTransactions.sort((a, b) => {
      const timeA = new Date(a.block_timestamp).getTime();
      const timeB = new Date(b.block_timestamp).getTime();
      return timeB - timeA;
    });

    setFilteredTransactions(allTransactions);
  };

  const getTransactionTypeBadge = (
    tx: MoralisWalletHistory | MoralisTransaction
  ) => {
    // Check if it's wallet history (has category) or native transaction
    if ("category" in tx) {
      const category = tx.category || "unknown";
      const method = tx.method_label || "transfer";

      if (category === "token transfer" || method === "transfer") {
        return <Badge variant="outline">Token Transfer</Badge>;
      }
      if (category === "nft" || method.includes("nft")) {
        return <Badge variant="secondary">NFT</Badge>;
      }
      if (method === "swap" || category.includes("swap")) {
        return <Badge className="bg-blue-100 text-blue-800">Swap</Badge>;
      }
      return <Badge variant="outline">{method || "Transaction"}</Badge>;
    } else {
      // Native transaction
      return <Badge variant="default">Native</Badge>;
    }
  };

  const getStatusBadge = (tx: MoralisWalletHistory | MoralisTransaction) => {
    // Check transaction status
    if ("receipt_status" in tx) {
      const status = tx.receipt_status;
      if (status === "1") {
        return (
          <Badge className="bg-green-100 text-green-800">
            <CheckCircle className="h-3 w-3 mr-1" />
            Success
          </Badge>
        );
      } else {
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            Failed
          </Badge>
        );
      }
    }

    // For wallet history, assume success if no status field
    return (
      <Badge className="bg-green-100 text-green-800">
        <CheckCircle className="h-3 w-3 mr-1" />
        Success
      </Badge>
    );
  };

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatAmount = (value: string) => {
    const ethValue = parseFloat(ethers.utils.formatEther(value));
    return ethValue.toFixed(6);
  };

  const getTransactionValue = (
    tx: MoralisWalletHistory | MoralisTransaction
  ) => {
    // For wallet history with ERC20 transfers, show token transfers
    if (
      "erc20_transfers" in tx &&
      tx.erc20_transfers &&
      tx.erc20_transfers.length > 0
    ) {
      const transfer = tx.erc20_transfers[0];
      return `${transfer.value_formatted} ${transfer.token_symbol}`;
    }

    // For native transfers in wallet history
    if (
      "native_transfers" in tx &&
      tx.native_transfers &&
      tx.native_transfers.length > 0
    ) {
      const transfer = tx.native_transfers[0];
      return `${transfer.value_formatted} ${transfer.token_symbol}`;
    }

    // For native transactions or fallback
    const ethValue = parseFloat(ethers.utils.formatEther(tx.value || "0"));
    return `${ethValue.toFixed(6)} ETH`;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Transaction History</h1>
          <p className="text-muted-foreground">
            Loading your transaction history...
          </p>
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
        <h1 className="text-3xl font-bold">Transaction History</h1>
        <p className="text-muted-foreground">
          View your complete wallet transaction history from Ethereum
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <div className="space-y-1">
                <p className="text-sm font-medium leading-none">
                  Total Transactions
                </p>
                <p className="text-2xl font-bold">
                  {nativeTransactions.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <ExternalLink className="h-4 w-4 text-purple-600" />
              <div className="space-y-1">
                <p className="text-sm font-medium leading-none">Native Txns</p>
                <p className="text-2xl font-bold">
                  {nativeTransactions.length}
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
                <p className="text-sm font-medium leading-none">
                  Sepolia Network
                </p>
                <p className="text-2xl font-bold">✓</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-green-600" />
              <div className="space-y-1">
                <p className="text-sm font-medium leading-none">Success Rate</p>
                <p className="text-2xl font-bold">
                  {nativeTransactions.length > 0
                    ? Math.round(
                        (nativeTransactions.filter(
                          (tx) => tx.receipt_status === "1"
                        ).length /
                          nativeTransactions.length) *
                          100
                      )
                    : 100}
                  %
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
                  placeholder="Search by hash, address, or label..."
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
                  <SelectItem value="all">All Transactions</SelectItem>
                  <SelectItem value="native">Native Transactions</SelectItem>
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
            {filteredTransactions.length} of{" "}
            {nativeTransactions.length} transactions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredTransactions.length === 0 ? (
            <div className="text-center py-12 space-y-4">
              <div className="text-muted-foreground">
                {nativeTransactions.length === 0 ? (
                  <div className="space-y-2">
                    <p className="text-lg font-medium">
                      No transaction history found
                    </p>
                    <p className="text-sm">
                      No transactions found for this wallet.
                    </p>
                    <p className="text-xs">
                      Your wallet transactions will appear here.
                    </p>
                  </div>
                ) : (
                  <p>No transactions match your current filters</p>
                )}
              </div>
              {nativeTransactions.length === 0 && (
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>Debug info:</p>
                  <p>
                    Wallet:{" "}
                    {user?.wallet?.address
                      ? `${user.wallet.address.slice(
                          0,
                          6
                        )}...${user.wallet.address.slice(-4)}`
                      : "Not connected"}
                  </p>
                  <p>Service: {loading ? "Loading..." : "Ready"}</p>
                </div>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Transaction Hash</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>From</TableHead>
                  <TableHead>To</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.map((tx, index) => (
                  <TableRow key={`${tx.hash}-${index}`}>
                    <TableCell className="font-mono">
                      <a
                        href={`https://eth-sepolia.blockscout.com/tx/${tx.hash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800"
                      >
                        {tx.hash.slice(0, 10)}...{tx.hash.slice(-8)}
                      </a>
                    </TableCell>
                    <TableCell>{formatDate(tx.block_timestamp)}</TableCell>
                    <TableCell className="font-mono">
                      <div className="space-y-1">
                        <div>
                          {tx.from_address.slice(0, 6)}...
                          {tx.from_address.slice(-4)}
                        </div>
                        {tx.from_address_label && (
                          <div className="text-xs text-muted-foreground">
                            {tx.from_address_label}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono">
                      <div className="space-y-1">
                        <div>
                          {tx.to_address.slice(0, 6)}...
                          {tx.to_address.slice(-4)}
                        </div>
                        {tx.to_address_label && (
                          <div className="text-xs text-muted-foreground">
                            {tx.to_address_label}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono">
                      {getTransactionValue(tx)}
                    </TableCell>
                    <TableCell>{getTransactionTypeBadge(tx)}</TableCell>
                    <TableCell>{getStatusBadge(tx)}</TableCell>
                    <TableCell>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedTransaction(tx)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Transaction Details</DialogTitle>
                            <DialogDescription>
                              Complete transaction information and blockchain
                              details
                            </DialogDescription>
                          </DialogHeader>

                          {selectedTransaction && (
                            <div className="space-y-6">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <Label>Transaction Hash</Label>
                                  <p className="font-mono text-sm break-all">
                                    {selectedTransaction.hash}
                                  </p>
                                </div>
                                <div>
                                  <Label>Block Number</Label>
                                  <p className="font-mono">
                                    {selectedTransaction.block_number}
                                  </p>
                                </div>
                                <div>
                                  <Label>Status</Label>
                                  <div className="mt-1">
                                    {getStatusBadge(selectedTransaction)}
                                  </div>
                                </div>
                                <div>
                                  <Label>Type</Label>
                                  <div className="mt-1">
                                    {getTransactionTypeBadge(
                                      selectedTransaction
                                    )}
                                  </div>
                                </div>
                                <div>
                                  <Label>Timestamp</Label>
                                  <p>
                                    {formatDate(
                                      selectedTransaction.block_timestamp
                                    )}
                                  </p>
                                </div>
                                <div>
                                  <Label>Transaction Fee</Label>
                                  <p className="font-mono">
                                    {"transaction_fee" in selectedTransaction
                                      ? `${parseFloat(
                                          selectedTransaction.transaction_fee
                                        ).toFixed(8)} ETH`
                                      : "N/A"}
                                  </p>
                                </div>
                              </div>

                              <Separator />

                              <div className="space-y-2">
                                <Label>Transaction Details</Label>
                                <div className="bg-muted p-4 rounded-lg space-y-2">
                                  <div className="flex justify-between">
                                    <span>Value:</span>
                                    <span className="font-mono">
                                      {getTransactionValue(selectedTransaction)}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>From:</span>
                                    <span className="font-mono text-sm">
                                      {selectedTransaction.from_address}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>To:</span>
                                    <span className="font-mono text-sm">
                                      {selectedTransaction.to_address}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {"erc20_transfers" in selectedTransaction &&
                                selectedTransaction.erc20_transfers &&
                                selectedTransaction.erc20_transfers.length >
                                  0 && (
                                  <div className="space-y-2">
                                    <Label>Token Transfers</Label>
                                    <div className="space-y-2">
                                      {selectedTransaction.erc20_transfers.map(
                                        (transfer, idx) => (
                                          <div
                                            key={idx}
                                            className="p-3 bg-muted rounded-lg"
                                          >
                                            <div className="flex justify-between items-center">
                                              <span className="font-medium">
                                                {transfer.token_name} (
                                                {transfer.token_symbol})
                                              </span>
                                              <span className="font-mono">
                                                {transfer.value_formatted}
                                              </span>
                                            </div>
                                          </div>
                                        )
                                      )}
                                    </div>
                                  </div>
                                )}

                              <div className="space-y-2">
                                <Label>Blockscout Link</Label>
                                <a
                                  href={`https://eth-sepolia.blockscout.com/tx/${selectedTransaction.hash}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800"
                                >
                                  <ExternalLink className="h-4 w-4" />
                                  View on Blockskout
                                </a>
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
