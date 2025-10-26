"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import {
  Home,
  Send,
  CreditCard,
  Users,
  Settings,
  Wallet,
  BarChart3,
  Zap,
  Gift,
  FileText,
  ArrowUpDown,
  Package,
  ChevronDown,
  ChevronRight,
  LogOut,
  User,
  Bell,
  HelpCircle,
  Receipt,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface SidebarItem {
  title: string;
  href?: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  children?: SidebarItem[];
  isNew?: boolean;
}

const sidebarItems: SidebarItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: Home,
  },
  {
    title: "Payments",
    icon: CreditCard,
    children: [
      {
        title: "Create Payment",
        href: "/dashboard/payments/create",
        icon: Send,
      },
      {
        title: "Payment History",
        href: "/dashboard/payments/history",
        icon: FileText,
      },
      {
        title: "Escrow Payments",
        href: "/dashboard/payments/escrow",
        icon: Package,
      },
    ],
  },
  {
    title: "Bulk Payments",
    icon: ArrowUpDown,
    isNew: true,
    children: [
      {
        title: "Send to One",
        href: "/dashboard/bulk/single",
        icon: Send,
      },
      {
        title: "Send to Many",
        href: "/dashboard/bulk/multiple",
        icon: Users,
      },
      {
        title: "Bulk History",
        href: "/dashboard/bulk/history",
        icon: FileText,
      },
    ],
  },
  {
    title: "Wallet",
    icon: Wallet,
    children: [
      {
        title: "Send Money",
        href: "/dashboard/wallet/send",
        icon: Send,
      },
      {
        title: "Receive Money",
        href: "/dashboard/wallet/receive",
        icon: Receipt,
      },
      {
        title: "Transaction History",
        href: "/dashboard/wallet/history",
        icon: FileText,
      },
    ],
  },
  {
    title: "Affiliates",
    href: "/dashboard/affiliates",
    icon: Users,
    badge: "20%",
  },
  {
    title: "Spin & Win",
    href: "/dashboard/gamification",
    icon: Zap,
  },
  {
    title: "Subscriptions",
    href: "/dashboard/subscriptions",
    icon: Gift,
  },
];

const bottomItems: SidebarItem[] = [
  {
    title: "Help & Support",
    href: "/dashboard/help",
    icon: HelpCircle,
  },
  {
    title: "Settings",
    href: "/dashboard/settings",
    icon: Settings,
  },
];

interface DashboardSidebarProps {
  className?: string;
}

export default function DashboardSidebar({ className }: DashboardSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = usePrivy();
  const [openItems, setOpenItems] = useState<string[]>([
    "Payments",
    "Bulk Payments",
    "Wallet",
  ]);

  const toggleItem = (title: string) => {
    setOpenItems((prev) =>
      prev.includes(title)
        ? prev.filter((item) => item !== title)
        : [...prev, title]
    );
  };

  const isActive = (href: string) => {
    return pathname === href || pathname.startsWith(href + "/");
  };

  const renderSidebarItem = (item: SidebarItem, level = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isOpen = openItems.includes(item.title);
    const active = item.href ? isActive(item.href) : false;

    if (hasChildren) {
      return (
        <Collapsible
          key={item.title}
          open={isOpen}
          onOpenChange={() => toggleItem(item.title)}
        >
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              className={cn(
                "w-full justify-start gap-3 px-3 py-2 h-auto font-normal",
                level > 0 && "ml-4 w-[calc(100%-1rem)]",
                "hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              <span className="flex-1 text-left">{item.title}</span>
              {item.isNew && (
                <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
                  NEW
                </Badge>
              )}
              {item.badge && (
                <Badge variant="outline" className="text-xs px-1.5 py-0.5">
                  {item.badge}
                </Badge>
              )}
              {isOpen ? (
                <ChevronDown className="h-4 w-4 shrink-0" />
              ) : (
                <ChevronRight className="h-4 w-4 shrink-0" />
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-1">
            {item.children?.map((child) => renderSidebarItem(child, level + 1))}
          </CollapsibleContent>
        </Collapsible>
      );
    }

    return (
      <Button
        key={item.title}
        variant="ghost"
        className={cn(
          "w-full justify-start gap-3 px-3 py-2 h-auto font-normal",
          level > 0 && "ml-4 w-[calc(100%-1rem)]",
          active
            ? "bg-accent text-accent-foreground"
            : "hover:bg-accent hover:text-accent-foreground"
        )}
        onClick={() => item.href && router.push(item.href)}
      >
        <item.icon className="h-4 w-4 shrink-0" />
        <span className="flex-1 text-left">{item.title}</span>
        {item.isNew && (
          <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
            NEW
          </Badge>
        )}
        {item.badge && (
          <Badge variant="outline" className="text-xs px-1.5 py-0.5">
            {item.badge}
          </Badge>
        )}
      </Button>
    );
  };

  return (
    <div
      className={cn(
        "flex h-full w-64 flex-col bg-background border-r",
        className
      )}
    >
      {/* Header */}
      <div className="flex h-16 items-center gap-3 px-4 border-b">
        <img
          src="/logo.png"
          alt="PyLinks Logo"
          className="h-8 w-8 rounded-full"
        />
        <div className="flex flex-col">
          <span className="text-sm font-semibold">PyLinks</span>
          <span className="text-xs text-muted-foreground">
            Merchant Dashboard
          </span>
        </div>
      </div>

      {/* User Profile */}
      <div className="p-4 border-b">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 px-0 h-auto"
            >
              <Avatar className="h-8 w-8">
                <AvatarImage src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR5BSEPxHF0-PRxJlVMHla55wvcxWdSi8RU2g&s" />
                <AvatarFallback>
                  {user?.google?.name?.charAt(0) ||
                    user?.wallet?.address?.slice(2, 4).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col items-start">
                <span className="text-sm font-medium">
                  {user?.google?.name ||
                    `${user?.wallet?.address?.slice(
                      0,
                      6
                    )}...${user?.wallet?.address?.slice(-4)}`}
                </span>
                <span className="text-xs text-muted-foreground">
                  {user?.google?.email.slice(0, 18).concat("...") ||
                    "Wallet User"}
                </span>
              </div>
              <ChevronDown className="h-4 w-4 ml-auto" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push("/dashboard/profile")}>
              <User className="mr-2 h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => router.push("/dashboard/settings")}
            >
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => router.push("/dashboard/notifications")}
            >
              <Bell className="mr-2 h-4 w-4" />
              Notifications
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={async () => {
                try {
                  await logout();
                  router.push("/");
                } catch (error) {
                  console.error("Logout error:", error);
                  router.push("/");
                }
              }}
              className="text-red-600"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-auto py-4">
        <nav className="space-y-1 px-3">
          {sidebarItems.map((item) => renderSidebarItem(item))}
        </nav>
      </div>

      {/* Bottom Items */}
      <div className="border-t p-3">
        <nav className="space-y-1">
          {bottomItems.map((item) => renderSidebarItem(item))}
        </nav>
      </div>

      {/* Footer */}
      <div className="border-t p-4">
        <div className="text-xs text-muted-foreground text-center">
          <p>PyLinks v2.0</p>
          <p>Powered by PYUSD & Pyth</p>
        </div>
      </div>
    </div>
  );
}
