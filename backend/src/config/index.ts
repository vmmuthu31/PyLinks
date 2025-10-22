import dotenv from "dotenv";

dotenv.config();

export const config = {
  port: process.env.PORT || 8000,
  nodeEnv: process.env.NODE_ENV || "development",

  mongoUri: process.env.MONGODB_URI || "mongodb://localhost:27017/pylinks",

  rpcUrls: {
    sepolia: process.env.ETH_RPC_SEPOLIA || "",
    mainnet: process.env.ETH_RPC_MAINNET || "",
  },
  pyusdContracts: {
    sepolia:
      process.env.PYUSD_CONTRACT_SEPOLIA ||
      "0xCaC524BcA292aaade2DF8A05cC58F0a65B1B3bB9",
    mainnet:
      process.env.PYUSD_CONTRACT_MAINNET ||
      "0x6c3ea9036406852006290770bedfcaba0e23a0e8",
  },

  jwt: {
    secret: process.env.JWT_SECRET || "pylinks-super-secret-jwt-key",
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  },

  session: {
    expiryMinutes: parseInt(process.env.SESSION_EXPIRY_MINUTES || "30"),
    blockConfirmations: parseInt(process.env.BLOCK_CONFIRMATION_COUNT || "2"),
  },

  webhook: {
    secret: process.env.WEBHOOK_SECRET || "pylinks-webhook-signing-secret",
    retryCount: parseInt(process.env.WEBHOOK_RETRY_COUNT || "3"),
    timeoutMs: parseInt(process.env.WEBHOOK_TIMEOUT_MS || "5000"),
  },

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "900000"),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || "100"),
  },

  allowedOrigins: process.env.ALLOWED_ORIGINS?.split(",") || [
    "http://localhost:3000",
    "http://localhost:19006",
  ],
};
