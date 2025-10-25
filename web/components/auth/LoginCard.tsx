"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, LogIn, UserPlus, AlertCircle } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import { setUser, setLoading, setError, clearError } from "@/lib/store/slices/authSlice";
import { setMerchant } from "@/lib/store/slices/merchantSlice";
import { toast } from "sonner";
import axios from "axios";

export default function LoginCard() {
  const { ready, authenticated, user, login, logout, signMessage } = usePrivy();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { loading, error } = useAppSelector((state) => state.auth);
  const [action, setAction] = useState<"login" | "register">("login");
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (ready && authenticated && user && !isProcessing) {
      handleAuthSuccess();
    }
  }, [ready, authenticated, user]);

  const handleAuthSuccess = async () => {
    if (!user || isProcessing) return;
    
    console.log("🔐 Starting authentication process...", { user, action });
    
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
        linkedAccounts: user.linkedAccounts?.map(acc => ({ 
          type: acc.type, 
          email: (acc as any).email, 
          address: (acc as any).address 
        }))
      });

      if (!userEmail) {
        throw new Error("Email is required for authentication. Please login with Google or email.");
      }

      console.log("📧 User details:", { userEmail, userName, walletAddress });

      // Create signing message for PyLinks authentication
      const timestamp = Date.now();
      const message = `Welcome to PyLinks - PYUSD Payment Infrastructure!

By signing this message, you are authenticating with PyLinks merchant portal.

Action: ${action.toUpperCase()}
Email: ${userEmail}
Timestamp: ${timestamp}
Domain: ${window.location.hostname}

This signature proves you own this wallet and authorizes access to your PyLinks merchant account.`;

      console.log("✍️ Requesting signature...");
      
      // Request signature from user
      const signature = await signMessage({ message });
      console.log("✅ Message signed successfully");

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
        action: action
      };

      console.log("🚀 Calling backend API...", { endpoint: action, payload: { ...payload, signature: "***" } });

      // Call backend API
      const endpoint = action === "register" 
        ? `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/merchants/register`
        : `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/merchants/login`;

      const response = await axios.post(endpoint, payload, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 10000, // 10 second timeout
      });

      console.log("📡 Backend response:", response.data);
      
      if (response.data?.success) {
        const merchantData = response.data.data;
        dispatch(setMerchant(merchantData));
        localStorage.setItem("merchant", JSON.stringify(merchantData));
        
        toast.success(`${action === 'register' ? 'Registration' : 'Login'} successful! Redirecting to dashboard...`);
        
        // Small delay to show success message
        setTimeout(() => {
          router.push("/dashboard");
        }, 1000);
      } else {
        throw new Error(response.data?.message || "Authentication failed");
      }
    } catch (error: any) {
      console.error("❌ Auth error:", error);
      
      let errorMessage = "Authentication failed";
      
      if (error.response?.status === 409 && action === "register") {
        errorMessage = "Merchant already exists. Please use the Login tab instead.";
        setAction("login"); // Switch to login tab
      } else if (error.response?.status === 404 && action === "login") {
        errorMessage = "No account found. Please register first.";
        setAction("register"); // Switch to register tab
      } else if (error.response?.data?.message) {
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

  const handleLogin = async (type: "login" | "register") => {
    console.log(`🎯 Initiating ${type}...`);
    
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

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-gray-900">
            PyLinks Merchant Portal
          </CardTitle>
          <CardDescription>
            Access your merchant dashboard to manage PYUSD payments
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert className="mb-4 border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                {error}
              </AlertDescription>
            </Alert>
          )}
          
          <Tabs value={action} onValueChange={(value) => setAction(value as "login" | "register")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login" className="flex items-center gap-2">
                <LogIn className="h-4 w-4" />
                Login
              </TabsTrigger>
              <TabsTrigger value="register" className="flex items-center gap-2">
                <UserPlus className="h-4 w-4" />
                Register
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="login" className="space-y-4 mt-6">
              <div className="text-center space-y-4">
                <p className="text-sm text-gray-600">
                  Login using your Google account or wallet to access your dashboard. 
                  You'll need to sign a message to verify your identity.
                </p>
                <Button
                  onClick={() => handleLogin("login")}
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
                      Login with Privy
                    </>
                  )}
                </Button>
              </div>
            </TabsContent>
            
            <TabsContent value="register" className="space-y-4 mt-6">
              <div className="text-center space-y-4">
                <p className="text-sm text-gray-600">
                  Register your merchant profile using Google authentication or wallet.
                  You'll need to sign a message to create your account.
                </p>
                <Button
                  onClick={() => handleLogin("register")}
                  disabled={loading || isProcessing}
                  className="w-full bg-green-600 hover:bg-green-700"
                  size="lg"
                >
                  {loading || isProcessing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {isProcessing ? "Processing..." : "Registering..."}
                    </>
                  ) : (
                    <>
                      <UserPlus className="mr-2 h-4 w-4" />
                      Register with Privy
                    </>
                  )}
                </Button>
              </div>
            </TabsContent>
          </Tabs>
          
          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              By continuing, you agree to sign a message to verify wallet ownership.
              This is required for secure authentication with PyLinks.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
