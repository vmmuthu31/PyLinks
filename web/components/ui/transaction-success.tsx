"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle, 
  ExternalLink, 
  Copy, 
  Eye,
  ArrowRight,
  Loader2
} from "lucide-react";
import { 
  getTransactionUrl, 
  openTransaction, 
  copyTransactionUrl, 
  formatTxHash 
} from "@/lib/utils/blockscout";
import { toast } from "sonner";

interface TransactionSuccessProps {
  txHash: string;
  title?: string;
  description?: string;
  amount?: string;
  onClose?: () => void;
  onContinue?: () => void;
  continueText?: string;
  showContinue?: boolean;
}

export default function TransactionSuccess({
  txHash,
  title = "Transaction Successful!",
  description = "Your transaction has been confirmed on the blockchain.",
  amount,
  onClose,
  onContinue,
  continueText = "Continue",
  showContinue = true
}: TransactionSuccessProps) {
  const [copying, setCopying] = useState(false);

  const handleCopyTxHash = async () => {
    setCopying(true);
    try {
      const success = await copyTransactionUrl(txHash);
      if (success) {
        toast.success("Transaction URL copied to clipboard!");
      } else {
        // Fallback to copying just the hash
        await navigator.clipboard.writeText(txHash);
        toast.success("Transaction hash copied to clipboard!");
      }
    } catch (error) {
      toast.error("Failed to copy to clipboard");
    } finally {
      setCopying(false);
    }
  };

  const handleViewOnBlockscout = () => {
    openTransaction(txHash);
    toast.success("Opening transaction in Blockscout Explorer");
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center pb-4">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
        </div>
        <CardTitle className="text-xl font-semibold text-green-800">
          {title}
        </CardTitle>
        <p className="text-sm text-muted-foreground mt-2">
          {description}
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Amount Display */}
        {amount && (
          <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
            <p className="text-sm text-green-700 mb-1">Amount</p>
            <p className="text-2xl font-bold text-green-800">${amount} PYUSD</p>
          </div>
        )}

        {/* Transaction Hash */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">
            Transaction Hash
          </label>
          <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border">
            <code className="flex-1 text-sm font-mono text-gray-800 truncate">
              {formatTxHash(txHash)}
            </code>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopyTxHash}
              disabled={copying}
              className="h-8 w-8 p-0"
            >
              {copying ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Status Badge */}
        <div className="flex justify-center">
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <CheckCircle className="h-3 w-3 mr-1" />
            Confirmed on Blockchain
          </Badge>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3 pt-2">
          <Button
            onClick={handleViewOnBlockscout}
            variant="outline"
            className="w-full"
          >
            <Eye className="h-4 w-4 mr-2" />
            View on Blockscout Explorer
            <ExternalLink className="h-4 w-4 ml-2" />
          </Button>

          <div className="grid grid-cols-2 gap-2">
            {onClose && (
              <Button
                onClick={onClose}
                variant="ghost"
                className="w-full"
              >
                Close
              </Button>
            )}
            
            {showContinue && onContinue && (
              <Button
                onClick={onContinue}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                {continueText}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>
        </div>

        {/* Explorer Info */}
        <div className="text-center pt-2 border-t">
          <p className="text-xs text-muted-foreground">
            Transaction details are available on{" "}
            <button
              onClick={handleViewOnBlockscout}
              className="text-blue-600 hover:underline font-medium"
            >
              Blockscout Explorer
            </button>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
