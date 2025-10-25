import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { WalletService } from "../services/WalletService";
import { ethers } from "ethers";

interface WalletContextType {
  address: string | null;
  balance: string | null;
  pyusdBalance: string | null;
  isLoading: boolean;
  hasWallet: boolean;
  createWallet: () => Promise<{ address: string; mnemonic: string }>;
  importWallet: (privateKey: string) => Promise<string>;
  loadWallet: () => Promise<void>;
  refreshBalances: () => Promise<void>;
  logout: () => Promise<void>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [pyusdBalance, setPyusdBalance] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasWallet, setHasWallet] = useState(false);

  useEffect(() => {
    initializeWallet();
  }, []);

  const initializeWallet = async () => {
    try {
      setIsLoading(true);
      const walletExists = await WalletService.hasWallet();
      setHasWallet(walletExists);

      if (walletExists) {
        await loadWallet();
      }
    } catch (error) {
      console.error("Failed to initialize wallet:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const createWallet = async () => {
    const result = await WalletService.createWallet();
    setAddress(result.address);
    setHasWallet(true);
    await refreshBalances();
    return result;
  };

  const importWallet = async (privateKey: string) => {
    const address = await WalletService.importWallet(privateKey);
    setAddress(address);
    setHasWallet(true);
    await refreshBalances();
    return address;
  };

  const loadWallet = async () => {
    const wallet = await WalletService.loadWallet();
    if (wallet) {
      setAddress(wallet.address);
      setHasWallet(true);
      await refreshBalances();
    }
  };

  const refreshBalances = async () => {
    try {
      const [ethBalance, pyusd] = await Promise.all([
        WalletService.getBalance(),
        WalletService.getPyusdBalance(),
      ]);
      setBalance(ethBalance);
      setPyusdBalance(pyusd);
    } catch (error) {
      console.error("Failed to fetch balances:", error);
    }
  };

  const logout = async () => {
    await WalletService.clearWallet();
    setAddress(null);
    setBalance(null);
    setPyusdBalance(null);
    setHasWallet(false);
  };

  return (
    <WalletContext.Provider
      value={{
        address,
        balance,
        pyusdBalance,
        isLoading,
        hasWallet,
        createWallet,
        importWallet,
        loadWallet,
        refreshBalances,
        logout,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error("useWallet must be used within WalletProvider");
  }
  return context;
}
