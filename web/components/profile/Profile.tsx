"use client";

import { useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { 
  User, 
  Mail, 
  Wallet, 
  Shield, 
  Edit,
  Save,
  Camera,
  Copy,
  ExternalLink
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export default function Profile() {
  const { user } = usePrivy();
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState(user?.google?.name || "");
  const [bio, setBio] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [website, setWebsite] = useState("");

  const handleSaveProfile = () => {
    // In a real app, this would save to backend
    toast.success("Profile updated successfully!");
    setIsEditing(false);
  };

  const copyWalletAddress = () => {
    if (user?.wallet?.address) {
      navigator.clipboard.writeText(user.wallet.address);
      toast.success("Wallet address copied to clipboard!");
    }
  };

  const getAccountType = () => {
    if (user?.google) return "Google";
    if (user?.email) return "Email";
    if (user?.wallet) return "Wallet";
    return "Unknown";
  };

  const getVerificationStatus = () => {
    // Mock verification status
    return {
      email: true,
      wallet: !!user?.wallet?.address,
      kyc: false,
      business: false
    };
  };

  const verification = getVerificationStatus();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Profile</h1>
          <p className="text-muted-foreground">
            Manage your account information and preferences
          </p>
        </div>
        <Button
          onClick={() => (isEditing ? handleSaveProfile() : setIsEditing(true))}
          variant={isEditing ? "default" : "outline"}
        >
          {isEditing ? (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </>
          ) : (
            <>
              <Edit className="h-4 w-4 mr-2" />
              Edit Profile
            </>
          )}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>
                Your personal and business details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Avatar className="h-20 w-20">
                    <AvatarImage src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR5BSEPxHF0-PRxJlVMHla55wvcxWdSi8RU2g&s" />
                    <AvatarFallback className="text-lg">
                      {user?.google?.name?.charAt(0) ||
                        user?.wallet?.address?.slice(2, 4).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {isEditing && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full p-0"
                    >
                      <Camera className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <div className="flex-1">
                  <div className="space-y-2">
                    <Label htmlFor="display-name">Display Name</Label>
                    <Input
                      id="display-name"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      disabled={!isEditing}
                      placeholder="Enter your display name"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="business-name">Business Name</Label>
                  <Input
                    id="business-name"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    disabled={!isEditing}
                    placeholder="Your business name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    disabled={!isEditing}
                    placeholder="https://yourwebsite.com"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  disabled={!isEditing}
                  placeholder="Tell us about yourself and your business..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Account Information */}
          <Card>
            <CardHeader>
              <CardTitle>Account Information</CardTitle>
              <CardDescription>
                Your account details and connected services
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Account Type</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline">{getAccountType()}</Badge>
                  </div>
                </div>
                <div>
                  <Label>Member Since</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {new Date(
                      user?.createdAt || Date.now()
                    ).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Email Address</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono">
                      {user?.google?.email ||
                        user?.email?.address ||
                        "Not connected"}
                    </span>
                    {verification.email && (
                      <Badge variant="outline" className="text-green-600">
                        Verified
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Wallet className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Wallet Address</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono">
                      {user?.wallet?.address
                        ? `${user.wallet.address.slice(
                            0,
                            6
                          )}...${user.wallet.address.slice(-4)}`
                        : "Not connected"}
                    </span>
                    {verification.wallet && (
                      <Badge variant="outline" className="text-green-600">
                        Connected
                      </Badge>
                    )}
                    {user?.wallet?.address && (
                      <Button
                        onClick={copyWalletAddress}
                        variant="ghost"
                        size="sm"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {/* Verification Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Verification Status
              </CardTitle>
              <CardDescription>
                Complete verification to unlock all features
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Email Verification</span>
                <Badge
                  variant={verification.email ? "outline" : "secondary"}
                  className={verification.email ? "text-green-600" : ""}
                >
                  {verification.email ? "Verified" : "Pending"}
                </Badge>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm">Wallet Connection</span>
                <Badge
                  variant={verification.wallet ? "outline" : "secondary"}
                  className={verification.wallet ? "text-green-600" : ""}
                >
                  {verification.wallet ? "Connected" : "Not Connected"}
                </Badge>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm">KYC Verification</span>
                <Badge
                  variant={verification.kyc ? "outline" : "secondary"}
                  className={verification.kyc ? "text-green-600" : ""}
                >
                  {verification.kyc ? "Verified" : "Not Started"}
                </Badge>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm">Business Verification</span>
                <Badge
                  variant={verification.business ? "outline" : "secondary"}
                  className={verification.business ? "text-green-600" : ""}
                >
                  {verification.business ? "Verified" : "Not Started"}
                </Badge>
              </div>

              <Separator />

              <Button variant="outline" size="sm" className="w-full">
                Complete Verification
              </Button>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Account Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">
                  Total Payments
                </span>
                <span className="font-semibold">0</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">
                  Total Volume
                </span>
                <span className="font-semibold">$0.00</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Referrals</span>
                <span className="font-semibold">0</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">
                  Loyalty Points
                </span>
                <span className="font-semibold">0</span>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                View on Etherscan
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start"
              >
                <Shield className="h-4 w-4 mr-2" />
                Security Settings
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start"
              >
                <User className="h-4 w-4 mr-2" />
                Privacy Settings
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
