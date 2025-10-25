import { ethers } from "ethers";
import * as SecureStore from "expo-secure-store";
import { BLOCKCHAIN_CONFIG } from "../config";

const WALLET_KEY = "pylinks_wallet_private_key";
const ADDRESS_KEY = "pylinks_wallet_address";

export class WalletService {
  private static provider: ethers.providers.JsonRpcProvider;
  private static wallet: ethers.Wallet | null = null;

  /**
   * Initialize the provider
   */
  static initProvider() {
    if (!this.provider) {
      this.provider = new ethers.providers.JsonRpcProvider(
        BLOCKCHAIN_CONFIG.rpcUrl
      );
    }
    return this.provider;
  }

  /**
   * Create a new wallet
   */
  static async createWallet(): Promise<{ address: string; mnemonic: string }> {
    const wallet = ethers.Wallet.createRandom();

    // Store private key securely
    await SecureStore.setItemAsync(WALLET_KEY, wallet.privateKey);
    await SecureStore.setItemAsync(ADDRESS_KEY, wallet.address);

    this.wallet = wallet.connect(this.initProvider());

    return {
      address: wallet.address,
      mnemonic: wallet.mnemonic.phrase,
    };
  }

  /**
   * Import wallet from private key
   */
  static async importWallet(privateKey: string): Promise<string> {
    try {
      const wallet = new ethers.Wallet(privateKey);

      await SecureStore.setItemAsync(WALLET_KEY, wallet.privateKey);
      await SecureStore.setItemAsync(ADDRESS_KEY, wallet.address);

      this.wallet = wallet.connect(this.initProvider());

      return wallet.address;
    } catch (error) {
      throw new Error("Invalid private key");
    }
  }

  /**
   * Load existing wallet
   */
  static async loadWallet(): Promise<ethers.Wallet | null> {
    try {
      const privateKey = await SecureStore.getItemAsync(WALLET_KEY);

      if (!privateKey) {
        return null;
      }

      const wallet = new ethers.Wallet(privateKey);
      this.wallet = wallet.connect(this.initProvider());

      return this.wallet;
    } catch (error) {
      console.error("Error loading wallet:", error);
      return null;
    }
  }

  /**
   * Get current wallet
   */
  static getWallet(): ethers.Wallet | null {
    return this.wallet;
  }

  /**
   * Get wallet address
   */
  static async getAddress(): Promise<string | null> {
    if (this.wallet) {
      return this.wallet.address;
    }

    return await SecureStore.getItemAsync(ADDRESS_KEY);
  }

  /**
   * Check if wallet exists
   */
  static async hasWallet(): Promise<boolean> {
    const address = await SecureStore.getItemAsync(ADDRESS_KEY);
    return !!address;
  }

  /**
   * Get wallet balance (ETH for gas)
   */
  static async getBalance(): Promise<string> {
    if (!this.wallet) {
      throw new Error("Wallet not loaded");
    }

    const balance = await this.wallet.getBalance();
    return ethers.utils.formatEther(balance);
  }

  /**
   * Get PYUSD balance
   */
  static async getPyusdBalance(): Promise<string> {
    if (!this.wallet) {
      throw new Error("Wallet not loaded");
    }

    const pyusdContract = new ethers.Contract(
      BLOCKCHAIN_CONFIG.contracts.pyusd,
      [
        "function balanceOf(address) view returns (uint256)",
        "function decimals() view returns (uint8)",
      ],
      this.wallet
    );

    const [balance, decimals] = await Promise.all([
      pyusdContract.balanceOf(this.wallet.address),
      pyusdContract.decimals(),
    ]);

    return ethers.utils.formatUnits(balance, decimals);
  }

  /**
   * Send PYUSD
   */
  static async sendPyusd(
    to: string,
    amount: string
  ): Promise<ethers.providers.TransactionResponse> {
    if (!this.wallet) {
      throw new Error("Wallet not loaded");
    }

    const pyusdContract = new ethers.Contract(
      BLOCKCHAIN_CONFIG.contracts.pyusd,
      [
        "function transfer(address to, uint256 amount) returns (bool)",
        "function decimals() view returns (uint8)",
      ],
      this.wallet
    );

    const decimals = await pyusdContract.decimals();
    const amountInWei = ethers.utils.parseUnits(amount, decimals);

    const tx = await pyusdContract.transfer(to, amountInWei);
    return tx;
  }

  /**
   * Approve PYUSD spending
   */
  static async approvePyusd(
    spender: string,
    amount: string
  ): Promise<ethers.providers.TransactionResponse> {
    if (!this.wallet) {
      throw new Error("Wallet not loaded");
    }

    const pyusdContract = new ethers.Contract(
      BLOCKCHAIN_CONFIG.contracts.pyusd,
      [
        "function approve(address spender, uint256 amount) returns (bool)",
        "function decimals() view returns (uint8)",
      ],
      this.wallet
    );

    const decimals = await pyusdContract.decimals();
    const amountInWei = ethers.utils.parseUnits(amount, decimals);

    const tx = await pyusdContract.approve(spender, amountInWei);
    return tx;
  }

  /**
   * Clear wallet (logout)
   */
  static async clearWallet(): Promise<void> {
    await SecureStore.deleteItemAsync(WALLET_KEY);
    await SecureStore.deleteItemAsync(ADDRESS_KEY);
    this.wallet = null;
  }

  /**
   * Sign message
   */
  static async signMessage(message: string): Promise<string> {
    if (!this.wallet) {
      throw new Error("Wallet not loaded");
    }

    return await this.wallet.signMessage(message);
  }
}
