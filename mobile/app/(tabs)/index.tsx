import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useWallet } from "@/contexts/WalletContext";
import * as Clipboard from "expo-clipboard";

export default function HomeScreen() {
  const {
    address,
    balance,
    pyusdBalance,
    isLoading,
    hasWallet,
    createWallet,
    refreshBalances,
  } = useWallet();

  const [refreshing, setRefreshing] = useState(false);
  const [creating, setCreating] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshBalances();
    setRefreshing(false);
  };

  const handleCreateWallet = async () => {
    try {
      setCreating(true);
      const { address: newAddress, mnemonic } = await createWallet();

      // Show mnemonic to user (important!)
      Alert.alert(
        "Wallet Created",
        `Your wallet has been created!\n\nAddress: ${newAddress}\n\n⚠️ IMPORTANT: Save your recovery phrase:\n\n${mnemonic}\n\nStore it safely - you'll need it to recover your wallet!`,
        [
          {
            text: "Copy Recovery Phrase",
            onPress: () => Clipboard.setStringAsync(mnemonic),
          },
          { text: "OK" },
        ]
      );
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to create wallet");
    } finally {
      setCreating(false);
    }
  };

  const handleCopyAddress = async () => {
    if (address) {
      await Clipboard.setStringAsync(address);
      Alert.alert("Copied!", "Address copied to clipboard");
    }
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0066FF" />
        <Text style={styles.loadingText}>Loading wallet...</Text>
      </View>
    );
  }

  if (!hasWallet) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.title}>Welcome to PyLinks</Text>
        <Text style={styles.subtitle}>
          Create or import a wallet to start making PYUSD payments
        </Text>

        <TouchableOpacity
          style={[styles.primaryButton, creating && styles.buttonDisabled]}
          onPress={handleCreateWallet}
          disabled={creating}
        >
          {creating ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>Create New Wallet</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>Import Wallet</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>My Wallet</Text>
        </View>

        {/* Balance Card */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>PYUSD Balance</Text>
          <Text style={styles.balanceAmount}>
            {pyusdBalance ? parseFloat(pyusdBalance).toFixed(2) : "0.00"} PYUSD
          </Text>

          <View style={styles.ethBalanceRow}>
            <Text style={styles.ethBalance}>
              ETH: {balance ? parseFloat(balance).toFixed(4) : "0.0000"}
            </Text>
          </View>
        </View>

        {/* Address Card */}
        <View style={styles.addressCard}>
          <Text style={styles.addressLabel}>Wallet Address</Text>
          <TouchableOpacity onPress={handleCopyAddress}>
            <Text style={styles.address}>
              {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : ""}
            </Text>
            <Text style={styles.copyHint}>Tap to copy</Text>
          </TouchableOpacity>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionButtonIcon}>📤</Text>
            <Text style={styles.actionButtonText}>Send</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionButtonIcon}>📥</Text>
            <Text style={styles.actionButtonText}>Receive</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionButtonIcon}>📷</Text>
            <Text style={styles.actionButtonText}>Scan QR</Text>
          </TouchableOpacity>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>

          <TouchableOpacity style={styles.listItem}>
            <Text style={styles.listItemIcon}>💳</Text>
            <Text style={styles.listItemText}>Pay with QR Code</Text>
            <Text style={styles.listItemArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.listItem}>
            <Text style={styles.listItemIcon}>📝</Text>
            <Text style={styles.listItemText}>Transaction History</Text>
            <Text style={styles.listItemArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.listItem}>
            <Text style={styles.listItemIcon}>⚙️</Text>
            <Text style={styles.listItemText}>Settings</Text>
            <Text style={styles.listItemArrow}>›</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#F5F5F5",
  },
  content: {
    flex: 1,
    padding: 20,
  },
  header: {
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#1A1A1A",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 10,
    textAlign: "center",
    color: "#1A1A1A",
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 40,
    paddingHorizontal: 20,
  },
  loadingText: {
    marginTop: 10,
    color: "#666",
  },
  balanceCard: {
    backgroundColor: "#0066FF",
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
  },
  balanceLabel: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 36,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 12,
  },
  ethBalanceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  ethBalance: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.9)",
  },
  addressCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  addressLabel: {
    fontSize: 12,
    color: "#666",
    marginBottom: 8,
  },
  address: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1A1A1A",
    marginBottom: 4,
  },
  copyHint: {
    fontSize: 12,
    color: "#0066FF",
  },
  actionButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 32,
  },
  actionButton: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 4,
    alignItems: "center",
  },
  actionButtonIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  actionButtonText: {
    fontSize: 14,
    color: "#1A1A1A",
    fontWeight: "500",
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1A1A1A",
    marginBottom: 12,
  },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  listItemIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  listItemText: {
    flex: 1,
    fontSize: 16,
    color: "#1A1A1A",
  },
  listItemArrow: {
    fontSize: 20,
    color: "#999",
  },
  primaryButton: {
    backgroundColor: "#0066FF",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginBottom: 12,
    width: "100%",
  },
  secondaryButton: {
    backgroundColor: "transparent",
    borderWidth: 2,
    borderColor: "#0066FF",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    width: "100%",
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  secondaryButtonText: {
    color: "#0066FF",
    fontSize: 16,
    fontWeight: "600",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
