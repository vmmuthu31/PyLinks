"use client";

import { useState, useEffect } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import { SidebarProvider, Sidebar } from "@/components/ui/sidebar";
import DashboardSidebar from "./DashboardSidebar";
import { Loader2 } from "lucide-react";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { ready, authenticated, user, logout } = usePrivy();
  const router = useRouter();

  useEffect(() => {
    if (ready) {
      if (!authenticated) {
        console.log("❌ User not authenticated, redirecting to login");
        router.push("/");
        return;
      }
      
      if (authenticated && !user?.wallet?.address) {
        console.log("❌ User wallet undefined, logging out and redirecting", {
          user: user,
          wallet: user?.wallet,
          address: user?.wallet?.address
        });
        
        // Logout and redirect to login
        logout().then(() => {
          router.push("/");
        }).catch((error) => {
          console.error("Logout error:", error);
          router.push("/");
        });
        return;
      }
    }
  }, [ready, authenticated, user, logout, router]);

  // Show loading while checking authentication
  if (!ready || !authenticated || !user?.wallet?.address) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto" />
          <p className="text-muted-foreground">Checking authentication...</p>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-screen flex w-full">
        <Sidebar>
          <DashboardSidebar />
        </Sidebar>
        <main className="flex-1 overflow-auto">
          <div className="container mx-auto p-6">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
