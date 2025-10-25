"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, LogIn, UserPlus } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import { setUser, setLoading, setError } from "@/lib/store/slices/authSlice";
import { setMerchant } from "@/lib/store/slices/merchantSlice";
import axios from "axios";

export default function LoginCard() {
  const { ready, authenticated, user, login, logout } = usePrivy();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { loading } = useAppSelector((state) => state.auth);
  const [action, setAction] = useState<"login" | "register">("login");

  useEffect(() => {
    if (ready && authenticated && user) {
      handleAuthSuccess();
    }
  }, [ready, authenticated, user]);

  const handleAuthSuccess = async () => {
    if (!user?.email?.address) return;

    try {
      dispatch(setLoading(true));

      // Update Redux auth state
      dispatch(setUser({
        id: user.id,
        email: user.email.address,
        name: user.google?.name || user.email.address,
        walletAddress: user.wallet?.address,
      }));

      // Call backend API
      const endpoint = action === "register" 
        ? `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/merchants/register`
        : `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/merchants/login`;

      const payload = {
        email: user.email.address,
        name: user.google?.name || user.email.address,
        walletAddress: user.wallet?.address,
      };

      const response = await axios.post(endpoint, payload);
      
      if (response.data.success) {
        dispatch(setMerchant(response.data.data));
        localStorage.setItem("merchant", JSON.stringify(response.data.data));
        router.push("/dashboard");
      }
    } catch (error: any) {
      console.error("Auth error:", error);
      
      if (error.response?.status === 409 && action === "register") {
        dispatch(setError("Merchant already exists. Please use the Login tab instead."));
      } else if (error.response?.status === 404 && action === "login") {
        dispatch(setError("No account found. Please register first."));
      } else {
        dispatch(setError(`Authentication failed: ${error.message || "Unexpected error"}`));
      }
      
      logout();
    } finally {
      dispatch(setLoading(false));
    }
  };

  const handleLogin = async (type: "login" | "register") => {
    setAction(type);
    if (!ready) return;
    
    try {
      dispatch(setLoading(true));
      await login();
    } catch (error) {
      console.error("Login error:", error);
      dispatch(setError("Failed to authenticate"));
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
                  Login using your Google account or wallet to access your dashboard
                </p>
                <Button
                  onClick={() => handleLogin("login")}
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  size="lg"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Logging in...
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
                  Register your merchant profile using Google authentication or wallet
                </p>
                <Button
                  onClick={() => handleLogin("register")}
                  disabled={loading}
                  className="w-full bg-green-600 hover:bg-green-700"
                  size="lg"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Registering...
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
        </CardContent>
      </Card>
    </div>
  );
}
