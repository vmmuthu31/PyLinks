"use client";

import { useState } from "react";
import {
  Bell,
  CheckCircle,
  AlertCircle,
  Info,
  DollarSign,
  Users,
  Gift,
  Settings,
  Trash2,
  Ungroup,
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
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

interface Notification {
  id: string;
  type: "payment" | "system" | "promotion" | "security";
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  priority: "low" | "medium" | "high";
}

export default function Notifications() {
  const [filter, setFilter] = useState("all");
  const [selectedNotifications, setSelectedNotifications] = useState<string[]>(
    []
  );

  // Mock notifications data
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: "1",
      type: "payment",
      title: "Payment Received",
      message:
        "You received a payment of $25.00 PYUSD from customer 0x123...abc",
      timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
      read: false,
      priority: "high",
    },
    {
      id: "2",
      type: "system",
      title: "Bulk Payment Completed",
      message:
        "Your bulk payment batch #1234 has been successfully processed. 5 payments sent.",
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
      read: false,
      priority: "medium",
    },
    {
      id: "3",
      type: "promotion",
      title: "New Feature: Spin & Win",
      message:
        "Try our new gamification feature! Earn spin credits and win PYUSD rewards.",
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
      read: true,
      priority: "low",
    },
    {
      id: "4",
      type: "security",
      title: "New Login Detected",
      message: "A new login to your account was detected from Chrome on macOS.",
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2), // 2 days ago
      read: true,
      priority: "high",
    },
    {
      id: "5",
      type: "payment",
      title: "Escrow Payment Created",
      message:
        "An escrow payment of $100.00 has been created and is awaiting customer payment.",
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3), // 3 days ago
      read: true,
      priority: "medium",
    },
  ]);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "payment":
        return <DollarSign className="h-4 w-4 text-green-600" />;
      case "system":
        return <Info className="h-4 w-4 text-blue-600" />;
      case "promotion":
        return <Gift className="h-4 w-4 text-purple-600" />;
      case "security":
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Bell className="h-4 w-4 text-gray-600" />;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "high":
        return (
          <Badge variant="destructive" className="text-xs">
            High
          </Badge>
        );
      case "medium":
        return (
          <Badge variant="outline" className="text-xs">
            Medium
          </Badge>
        );
      case "low":
        return (
          <Badge variant="secondary" className="text-xs">
            Low
          </Badge>
        );
      default:
        return null;
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const filteredNotifications = notifications.filter((notification) => {
    if (filter === "all") return true;
    if (filter === "unread") return !notification.read;
    return notification.type === filter;
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    toast.success("Marked as read");
  };

  const handleMarkAsUnread = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: false } : n))
    );
    toast.success("Marked as unread");
  };

  const handleDelete = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    toast.success("Notification deleted");
  };

  const handleMarkAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    toast.success("All notifications marked as read");
  };

  const handleDeleteSelected = () => {
    setNotifications((prev) =>
      prev.filter((n) => !selectedNotifications.includes(n.id))
    );
    setSelectedNotifications([]);
    toast.success(`${selectedNotifications.length} notifications deleted`);
  };

  const handleSelectNotification = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedNotifications((prev) => [...prev, id]);
    } else {
      setSelectedNotifications((prev) => prev.filter((nId) => nId !== id));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedNotifications(filteredNotifications.map((n) => n.id));
    } else {
      setSelectedNotifications([]);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Notifications</h1>
          <p className="text-muted-foreground">
            Stay updated with your account activity and important updates
          </p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Badge variant="outline" className="text-blue-600">
              {unreadCount} unread
            </Badge>
          )}
          <Button onClick={handleMarkAllAsRead} variant="outline" size="sm">
            Mark All Read
          </Button>
        </div>
      </div>

      {/* Filters and Actions */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Notifications</SelectItem>
                  <SelectItem value="unread">Unread Only</SelectItem>
                  <SelectItem value="payment">Payments</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                  <SelectItem value="promotion">Promotions</SelectItem>
                  <SelectItem value="security">Security</SelectItem>
                </SelectContent>
              </Select>

              {selectedNotifications.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    {selectedNotifications.length} selected
                  </span>
                  <Button
                    onClick={handleDeleteSelected}
                    variant="outline"
                    size="sm"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete Selected
                  </Button>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                checked={
                  selectedNotifications.length ===
                    filteredNotifications.length &&
                  filteredNotifications.length > 0
                }
                onCheckedChange={handleSelectAll}
              />
              <span className="text-sm text-muted-foreground">Select All</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notifications List */}
      <div className="space-y-2">
        {filteredNotifications.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Bell className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-semibold mb-2">No notifications</h3>
              <p className="text-muted-foreground">
                {filter === "unread"
                  ? "You're all caught up! No unread notifications."
                  : "You don't have any notifications yet."}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredNotifications.map((notification) => (
            <Card
              key={notification.id}
              className={`transition-colors ${
                !notification.read ? "bg-blue-50 border-blue-200" : ""
              }`}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={selectedNotifications.includes(notification.id)}
                    onCheckedChange={(checked) =>
                      handleSelectNotification(
                        notification.id,
                        checked as boolean
                      )
                    }
                  />

                  <div className="flex-shrink-0 mt-1">
                    {getNotificationIcon(notification.type)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <h4
                          className={`font-semibold ${
                            !notification.read ? "text-blue-900" : ""
                          }`}
                        >
                          {notification.title}
                        </h4>
                        {!notification.read && (
                          <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                        )}
                        {getPriorityBadge(notification.priority)}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatTimestamp(notification.timestamp)}
                      </span>
                    </div>

                    <p className="text-sm text-muted-foreground mb-3">
                      {notification.message}
                    </p>

                    <div className="flex items-center gap-2">
                      {!notification.read ? (
                        <Button
                          onClick={() => handleMarkAsRead(notification.id)}
                          variant="ghost"
                          size="sm"
                          className="text-xs"
                        >
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Mark as Read
                        </Button>
                      ) : (
                        <Button
                          onClick={() => handleMarkAsUnread(notification.id)}
                          variant="ghost"
                          size="sm"
                          className="text-xs"
                        >
                          <Ungroup className="h-3 w-3 mr-1" />
                          Mark as Unread
                        </Button>
                      )}

                      <Button
                        onClick={() => handleDelete(notification.id)}
                        variant="ghost"
                        size="sm"
                        className="text-xs text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Notification Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Notification Preferences
          </CardTitle>
          <CardDescription>
            Manage how you receive notifications
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <h4 className="font-semibold">Email Notifications</h4>
              <div className="space-y-2 text-sm">
                <label className="flex items-center gap-2">
                  <Checkbox defaultChecked />
                  Payment notifications
                </label>
                <label className="flex items-center gap-2">
                  <Checkbox defaultChecked />
                  Security alerts
                </label>
                <label className="flex items-center gap-2">
                  <Checkbox />
                  Marketing updates
                </label>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-semibold">Push Notifications</h4>
              <div className="space-y-2 text-sm">
                <label className="flex items-center gap-2">
                  <Checkbox defaultChecked />
                  Real-time payment alerts
                </label>
                <label className="flex items-center gap-2">
                  <Checkbox defaultChecked />
                  System notifications
                </label>
                <label className="flex items-center gap-2">
                  <Checkbox />
                  Promotional offers
                </label>
              </div>
            </div>
          </div>

          <Separator className="my-4" />

          <Button variant="outline">
            <Settings className="h-4 w-4 mr-2" />
            Advanced Settings
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
