"use client";

import { useState } from "react";
import { SidebarProvider, Sidebar } from "@/components/ui/sidebar";
import DashboardSidebar from "./DashboardSidebar";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
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
