"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  User, 
  LogOut, 
  Wallet, 
  History, 
  DollarSign,
  CheckCircle,
  Clock,
  AlertCircle
} from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import { clearUser } from "@/lib/store/slices/authSlice";
import { toast } from "sonner";

export default function CustomerDashboard() {
  const { ready, authenticated, user, logout } = usePrivy();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [customerData, setCustomerData] = useState<any>(null);

  useEffect(() => {
    if (ready && !authenticated) {
      router.push("/");
    }
  }, [ready, authenticated, router]);

  useEffect(() => {
    const storedCustomer = localStorage.getItem("customer");
    if (storedCustomer) {
      setCustomerData(JSON.parse(storedCustomer));
    }
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      dispatch(clearUser());
      localStorage.clear();
      router.push("/");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  if (!ready || !authenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const googleAccount = user?.linkedAccounts?.find(account => account.type === 'google_oauth');
  const emailAccount = user?.linkedAccounts?.find(account => account.type === 'email');
  const walletAccount = user?.linkedAccounts?.find(account => account.type === 'wallet');
  
  const userEmail = (googleAccount as any)?.email || (emailAccount as any)?.address || user?.email?.address;
  const userName = (googleAccount as any)?.name || user?.google?.name || userEmail?.split('@')[0] || 'Customer';
  const walletAddress = (walletAccount as any)?.address || user?.wallet?.address;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <User className="h-6 w-6" />
                Customer Dashboard
              </h1>
              <p className="text-gray-600">Manage your PYUSD payments and transactions</p>
            </div>
            <Button onClick={handleLogout} variant="outline" className="flex items-center gap-2">
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Customer Info */}
          <div className="lg:col-span-1 space-y-6">
            {/* Customer Info Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Customer Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Name</label>
                  <p className="text-sm text-gray-900">{userName}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Email</label>
                  <p className="text-sm text-gray-900">{userEmail}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Wallet Status</label>
                  <div className="flex items-center gap-2">
                    {walletAddress ? (
                      <Badge variant="default" className="bg-green-100 text-green-800">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Connected
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-red-100 text-red-800">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        Not Connected
                      </Badge>
                    )}
                  </div>
                  {walletAddress && (
                    <p className="text-xs text-gray-500 font-mono mt-1">
                      {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wallet className="h-5 w-5" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  onClick={() => router.push("/")}
                  className="w-full"
                  variant="outline"
                >
                  <DollarSign className="mr-2 h-4 w-4" />
                  Make a Payment
                </Button>
                
                <Button
                  onClick={() => toast.info("Transaction history coming soon!")}
                  variant="outline"
                  className="w-full"
                >
                  <History className="mr-2 h-4 w-4" />
                  View Transaction History
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Recent Activity */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Recent Activity
                </CardTitle>
                <CardDescription>
                  Your recent PYUSD transactions and payments
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-gray-500">
                  <DollarSign className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No transactions yet</h3>
                  <p className="text-sm text-gray-600 mb-6">
                    Your payment history will appear here once you make your first transaction.
                  </p>
                  <Button onClick={() => router.push("/")}>
                    <DollarSign className="mr-2 h-4 w-4" />
                    Make Your First Payment
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
