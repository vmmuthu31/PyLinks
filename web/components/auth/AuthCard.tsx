"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Loader2, 
  LogIn, 
  AlertCircle, 
  Store, 
  User, 
  Wallet,
  Mail,
  Shield
} from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import { setUser, setLoading, setError, clearError } from "@/lib/store/slices/authSlice";
import { setMerchant } from "@/lib/store/slices/merchantSlice";
import { toast } from "sonner";
import axios from "axios";

type UserType = "merchant" | "customer";
type AuthAction = "login" | "register";

export default function AuthCard() {
  const { ready, authenticated, user, login, logout, signMessage } = usePrivy();
  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch = useAppDispatch();
  const { loading, error } = useAppSelector((state) => state.auth);
  
  const [userType, setUserType] = useState<UserType>("merchant");
  const [action, setAction] = useState<AuthAction>("login");
  const [isProcessing, setIsProcessing] = useState(false);

  // Check if this is a customer payment flow
  useEffect(() => {
    const merchantId = searchParams.get("merchantId");
    const amount = searchParams.get("amount");
    
    if (merchantId && amount) {
      setUserType("customer");
    }
  }, [searchParams]);

  useEffect(() => {
    if (ready && authenticated && user && !isProcessing) {
      handleAuthSuccess();
    }
  }, [ready, authenticated, user, userType, action]);

  const handleAuthSuccess = async () => {
    if (!user || isProcessing) return;
    
    console.log("🔐 Starting authentication process...", { user, action, userType });
    
    try {
      setIsProcessing(true);
      dispatch(setLoading(true));
      dispatch(clearError());

      // Get user details from Privy's linked accounts
      const googleAccount = user.linkedAccounts?.find(account => account.type === 'google_oauth');
      const emailAccount = user.linkedAccounts?.find(account => account.type === 'email');
      const walletAccount = user.linkedAccounts?.find(account => account.type === 'wallet');
      
      const userEmail = (googleAccount as any)?.email || (emailAccount as any)?.address || user.email?.address;
      const userName = (googleAccount as any)?.name || user.google?.name || user.twitter?.name || userEmail?.split('@')[0] || 'Anonymous User';
      const walletAddress = (walletAccount as any)?.address || user.wallet?.address;

      console.log("📋 Extracted user details:", { 
        userEmail, 
        userName, 
        walletAddress,
        userType,
        linkedAccounts: user.linkedAccounts?.map(acc => ({ 
          type: acc.type, 
          email: (acc as any).email, 
          address: (acc as any).address 
        }))
      });

      if (!userEmail) {
        throw new Error("Email is required for authentication. Please login with Google or email.");
      }

      // Create signing message based on user type and wallet availability
      const timestamp = Date.now();
      const message = walletAddress 
        ? (userType === "merchant" 
          ? `Welcome to PyLinks Merchant Portal!

By signing this message, you are authenticating as a MERCHANT with PyLinks.

Action: ${action.toUpperCase()}
User Type: MERCHANT
Email: ${userEmail}
Wallet: ${walletAddress}
Timestamp: ${timestamp}
Domain: ${window.location.hostname}

This signature proves you own this wallet and authorizes access to your PyLinks merchant account.`
          : `Welcome to PyLinks Payment System!

By signing this message, you are authenticating as a CUSTOMER with PyLinks.

Action: ${action.toUpperCase()}
User Type: CUSTOMER
Email: ${userEmail}
Wallet: ${walletAddress}
Timestamp: ${timestamp}
Domain: ${window.location.hostname}

This signature proves you own this wallet and authorizes payment transactions.`)
        : `Welcome to PyLinks ${userType === "merchant" ? "Merchant Portal" : "Payment System"}!

You are authenticating as a ${userType.toUpperCase()} with PyLinks using email authentication.

Action: ${action.toUpperCase()}
User Type: ${userType.toUpperCase()}
Email: ${userEmail}
Timestamp: ${timestamp}
Domain: ${window.location.hostname}

No wallet signature required for this authentication method.`;

      let signature = null;
      
      // Only require signature if user has a wallet connected
      // For merchants: signature is optional (they can connect wallet later)
      // For customers: signature is required for payments
      if (walletAddress) {
        console.log("✍️ Requesting signature...");
        try {
          signature = await signMessage({ message });
          console.log("✅ Message signed successfully");
        } catch (signError) {
          console.error("❌ Signature failed:", signError);
          throw new Error("Wallet signature is required for authentication. Please connect a wallet first.");
        }
      } else if (userType === "customer") {
        // For customers making payments, suggest wallet connection but allow email-only auth
        // They'll be prompted to connect wallet when making actual payments
        console.log("ℹ️ Customer authentication without wallet - will need wallet for payments");
      } else {
        // For merchants, we can proceed without wallet signature
        console.log("ℹ️ No wallet connected, proceeding without signature for merchant account");
      }

      // Update Redux auth state first
      dispatch(setUser({
        id: user.id,
        email: userEmail,
        name: userName,
        walletAddress: walletAddress,
      }));

      // Prepare payload for backend
      const payload = {
        email: userEmail,
        name: userName,
        walletAddress: walletAddress,
        signature: signature,
        message: message,
        timestamp: timestamp,
        action: action,
        userType: userType
      };

      console.log("🚀 Calling backend API...", { 
        endpoint: action, 
        userType,
        payload: { ...payload, signature: "***" } 
      });

      // Call unified login endpoint - no separate register
      const endpoint = `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/auth/login`;

      const response = await axios.post(endpoint, payload, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 10000, // 10 second timeout
      });

      console.log("📡 Backend response:", response.data);
      
      if (response.data?.success) {
        const userData = response.data.data;
        
        if (userType === "merchant") {
          dispatch(setMerchant(userData));
          localStorage.setItem("merchant", JSON.stringify(userData));
        } else {
          localStorage.setItem("customer", JSON.stringify(userData));
        }
        
        toast.success(`Login successful! Redirecting...`);
        
        // Redirect based on user type and context
        setTimeout(() => {
          if (userType === "merchant") {
            router.push("/dashboard");
          } else {
            // For customers, redirect back to payment or to customer dashboard
            const merchantId = searchParams.get("merchantId");
            const amount = searchParams.get("amount");
            const memo = searchParams.get("memo");
            
            if (merchantId && amount) {
              router.push(`/pay?merchantId=${merchantId}&amount=${amount}&memo=${memo || ""}`);
            } else {
              router.push("/customer-dashboard");
            }
          }
        }, 1000);
      } else {
        throw new Error(response.data?.message || "Authentication failed");
      }
    } catch (error: any) {
      console.error("❌ Auth error:", error);
      
      let errorMessage = "Authentication failed";
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      dispatch(setError(errorMessage));
      toast.error(errorMessage);
      
      // Logout user to reset state
      try {
        await logout();
      } catch (logoutError) {
        console.error("Logout error:", logoutError);
      }
    } finally {
      dispatch(setLoading(false));
      setIsProcessing(false);
    }
  };

  const handleAuth = async (type: AuthAction) => {
    console.log(`🎯 Initiating ${type} for ${userType}...`);
    
    setAction(type);
    dispatch(clearError());
    
    if (!ready) {
      console.log("⏳ Privy not ready yet...");
      return;
    }
    
    try {
      dispatch(setLoading(true));
      console.log("🔑 Opening Privy login modal...");
      await login();
    } catch (error: any) {
      console.error("Login modal error:", error);
      dispatch(setError("Failed to open login dialog"));
      toast.error("Failed to open login dialog");
      dispatch(setLoading(false));
    }
  };

  if (!ready) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const merchantId = searchParams.get("merchantId");
  const amount = searchParams.get("amount");
  const isPaymentFlow = merchantId && amount;

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-gray-900 flex items-center justify-center gap-2">
            {userType === "merchant" ? <Store className="h-6 w-6" /> : <User className="h-6 w-6" />}
            PyLinks {userType === "merchant" ? "Merchant" : "Customer"} Portal
          </CardTitle>
          <CardDescription>
            {userType === "merchant" 
              ? "Access your merchant dashboard to manage PYUSD payments"
              : isPaymentFlow 
                ? `Complete payment of $${amount} USD`
                : "Access your customer account for PYUSD payments"
            }
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {/* User Type Selection (only if not in payment flow) */}
          {!isPaymentFlow && (
            <div className="mb-6">
              <div className="flex items-center justify-center space-x-1 bg-gray-100 rounded-lg p-1">
                <Button
                  variant={userType === "merchant" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setUserType("merchant")}
                  className="flex-1"
                >
                  <Store className="h-4 w-4 mr-2" />
                  Merchant
                </Button>
                <Button
                  variant={userType === "customer" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setUserType("customer")}
                  className="flex-1"
                >
                  <User className="h-4 w-4 mr-2" />
                  Customer
                </Button>
              </div>
            </div>
          )}

          {error && (
            <Alert className="mb-4 border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                {error}
              </AlertDescription>
            </Alert>
          )}
          
          <div className="space-y-6">
            {/* Simplified login form */}
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center space-x-2 text-sm text-gray-600 mb-4">
                <Badge variant="outline" className="flex items-center gap-1">
                  {userType === "merchant" ? <Store className="h-3 w-3" /> : <User className="h-3 w-3" />}
                  {userType.charAt(0).toUpperCase() + userType.slice(1)} Login
                </Badge>
              </div>
              
              <p className="text-sm text-gray-600">
                Login using Google, email, or wallet to access your {userType} account.
                {userType === "merchant" 
                  ? " Wallet connection is optional - you can connect it later in your dashboard."
                  : " You can login with email now and connect a wallet when making payments."
                }
              </p>
              
              <div className="flex items-center justify-center space-x-4 text-xs text-gray-500 my-3">
                <div className="flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  <span>Email/Google</span>
                </div>
                <div className="flex items-center gap-1">
                  <Wallet className="h-3 w-3" />
                  <span>Wallet</span>
                </div>
                <div className="flex items-center gap-1">
                  <Shield className="h-3 w-3" />
                  <span>Signature</span>
                </div>
              </div>
              
              <Button
                onClick={() => handleAuth("login")}
                disabled={loading || isProcessing}
                className="w-full bg-blue-600 hover:bg-blue-700"
                size="lg"
              >
                {loading || isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isProcessing ? "Processing..." : "Logging in..."}
                  </>
                ) : (
                  <>
                    <LogIn className="mr-2 h-4 w-4" />
                    Login as {userType.charAt(0).toUpperCase() + userType.slice(1)}
                  </>
                )}
              </Button>
            </div>
          </div>
          
          <Separator className="my-6" />
          
          <div className="text-center space-y-2">
            <p className="text-xs text-gray-500">
              By continuing, you agree to sign a message to verify wallet ownership.
              This is required for secure authentication with PyLinks.
            </p>
            {userType === "merchant" && (
              <p className="text-xs text-blue-600 font-medium">
                Merchants can create payment links, manage transactions, and access analytics.
              </p>
            )}
            {userType === "customer" && (
              <p className="text-xs text-green-600 font-medium">
                Customers can make secure PYUSD payments and track transaction history.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
