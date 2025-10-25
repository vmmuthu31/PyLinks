import Constants from "expo-constants";

// API Configuration
export const API_BASE_URL =
  Constants.expoConfig?.extra?.apiUrl ||
  "https://pylinks-backend.vercel.app/api";

// Blockchain Configuration
export const BLOCKCHAIN_CONFIG = {
  // Sepolia Testnet
  chainId: 11155111,
  chainName: "Sepolia",
  rpcUrl: "https://ethereum-sepolia-rpc.publicnode.com",
  blockExplorer: "https://sepolia.etherscan.io",

  // Contract Addresses
  contracts: {
    pyusd: "0xCaC524BcA292aaade2DF8A05cC58F0a65B1B3bB9",
    paymentEscrow: process.env.EXPO_PUBLIC_ESCROW_CONTRACT || "",
    recurringPayments: process.env.EXPO_PUBLIC_RECURRING_CONTRACT || "",
    paymentSplitter: process.env.EXPO_PUBLIC_SPLITTER_CONTRACT || "",
  },
};

// WalletConnect Configuration
export const WALLET_CONNECT_CONFIG = {
  projectId:
    process.env.EXPO_PUBLIC_WALLETCONNECT_PROJECT_ID || "YOUR_PROJECT_ID",
  metadata: {
    name: "PyLinks",
    description: "PYUSD Payment Infrastructure",
    url: "https://pylinks.io",
    icons: ["https://pylinks.io/icon.png"],
  },
};

// App Configuration
export const APP_CONFIG = {
  defaultCurrency: "USD",
  supportedCurrencies: ["USD", "PYUSD"],
  paymentTimeout: 30 * 60 * 1000, // 30 minutes
  qrCodeSize: 300,
};

export default {
  API_BASE_URL,
  BLOCKCHAIN_CONFIG,
  WALLET_CONNECT_CONFIG,
  APP_CONFIG,
};
