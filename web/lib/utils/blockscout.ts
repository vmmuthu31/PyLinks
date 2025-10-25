/**
 * Blockscout Explorer utilities for Ethereum Sepolia
 */

// Blockscout Sepolia Explorer URL
export const BLOCKSCOUT_BASE_URL = "https://eth-sepolia.blockscout.com";

/**
 * Generate Blockscout transaction URL
 */
export function getTransactionUrl(txHash: string): string {
  return `${BLOCKSCOUT_BASE_URL}/tx/${txHash}`;
}

/**
 * Generate Blockscout address URL
 */
export function getAddressUrl(address: string): string {
  return `${BLOCKSCOUT_BASE_URL}/address/${address}`;
}

/**
 * Generate Blockscout contract URL
 */
export function getContractUrl(address: string): string {
  return `${BLOCKSCOUT_BASE_URL}/address/${address}?tab=contract`;
}

/**
 * Generate Blockscout token URL
 */
export function getTokenUrl(address: string): string {
  return `${BLOCKSCOUT_BASE_URL}/token/${address}`;
}

/**
 * Open transaction in new tab
 */
export function openTransaction(txHash: string): void {
  window.open(getTransactionUrl(txHash), '_blank', 'noopener,noreferrer');
}

/**
 * Open address in new tab
 */
export function openAddress(address: string): void {
  window.open(getAddressUrl(address), '_blank', 'noopener,noreferrer');
}

/**
 * Copy transaction URL to clipboard
 */
export async function copyTransactionUrl(txHash: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(getTransactionUrl(txHash));
    return true;
  } catch (error) {
    console.error('Failed to copy transaction URL:', error);
    return false;
  }
}

/**
 * Format transaction hash for display (show first 6 and last 4 characters)
 */
export function formatTxHash(txHash: string): string {
  if (txHash.length < 10) return txHash;
  return `${txHash.slice(0, 6)}...${txHash.slice(-4)}`;
}

/**
 * Format address for display (show first 6 and last 4 characters)
 */
export function formatAddress(address: string): string {
  if (address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Validate if string is a valid transaction hash
 */
export function isValidTxHash(txHash: string): boolean {
  return /^0x[a-fA-F0-9]{64}$/.test(txHash);
}

/**
 * Validate if string is a valid Ethereum address
 */
export function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}
