"use client";

import { useState, useEffect, useCallback } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { ethers } from 'ethers';
import { CONTRACTS, SEPOLIA_RPC } from '@/lib/contracts/pylinks-core';
import { toast } from 'sonner';

interface WalletBalances {
  eth: string;
  pyusd: string;
  ethUSD: string; // ETH value in USD
  pyusdUSD: string; // PYUSD value in USD (should be 1:1)
  totalUSD: string;
}

interface UseWalletBalanceReturn {
  balances: WalletBalances;
  loading: boolean;
  error: string | null;
  refreshBalances: () => Promise<void>;
  formatBalance: (balance: string, decimals?: number) => string;
  formatUSD: (amount: string) => string;
}

// PYUSD Token ABI (minimal)
const PYUSD_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)"
];

export function useWalletBalance(): UseWalletBalanceReturn {
  const { user, ready } = usePrivy();
  const [balances, setBalances] = useState<WalletBalances>({
    eth: '0',
    pyusd: '0',
    ethUSD: '0',
    pyusdUSD: '0',
    totalUSD: '0'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get ETH price from a free API
  const getETHPrice = async (): Promise<number> => {
    try {
      const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd');
      const data = await response.json();
      return data.ethereum?.usd || 0;
    } catch (error) {
      console.warn('Failed to fetch ETH price:', error);
      return 0; // Fallback to 0 if price fetch fails
    }
  };

  const fetchBalances = useCallback(async () => {
    if (!ready || !user?.wallet?.address) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const provider = new ethers.providers.JsonRpcProvider(SEPOLIA_RPC);
      const walletAddress = user.wallet.address;

      // Fetch ETH balance
      const ethBalance = await provider.getBalance(walletAddress);
      const ethFormatted = ethers.utils.formatEther(ethBalance);

      // Fetch PYUSD balance
      const pyusdContract = new ethers.Contract(CONTRACTS.PYUSD, PYUSD_ABI, provider);
      const pyusdBalance = await pyusdContract.balanceOf(walletAddress);
      const pyusdFormatted = ethers.utils.formatUnits(pyusdBalance, 6); // PYUSD has 6 decimals

      // Get ETH price
      const ethPrice = await getETHPrice();
      
      // Calculate USD values
      const ethUSD = (parseFloat(ethFormatted) * ethPrice).toString();
      const pyusdUSD = pyusdFormatted; // PYUSD is 1:1 with USD
      const totalUSD = (parseFloat(ethUSD) + parseFloat(pyusdUSD)).toString();

      setBalances({
        eth: ethFormatted,
        pyusd: pyusdFormatted,
        ethUSD,
        pyusdUSD,
        totalUSD
      });

    } catch (err: any) {
      console.error('Error fetching wallet balances:', err);
      setError(err.message || 'Failed to fetch wallet balances');
      toast.error('Failed to fetch wallet balances');
    } finally {
      setLoading(false);
    }
  }, [ready, user?.wallet?.address]);

  // Auto-fetch balances when wallet is ready
  useEffect(() => {
    if (ready && user?.wallet?.address) {
      fetchBalances();
    }
  }, [ready, user?.wallet?.address, fetchBalances]);

  // Refresh balances manually
  const refreshBalances = useCallback(async () => {
    await fetchBalances();
    toast.success('Balances refreshed!');
  }, [fetchBalances]);

  // Format balance for display
  const formatBalance = useCallback((balance: string, decimals: number = 4): string => {
    const num = parseFloat(balance);
    if (num === 0) return '0';
    if (num < 0.0001) return '< 0.0001';
    return num.toFixed(decimals);
  }, []);

  // Format USD amount
  const formatUSD = useCallback((amount: string): string => {
    const num = parseFloat(amount);
    if (num === 0) return '$0.00';
    if (num < 0.01) return '< $0.01';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(num);
  }, []);

  return {
    balances,
    loading,
    error,
    refreshBalances,
    formatBalance,
    formatUSD
  };
}
