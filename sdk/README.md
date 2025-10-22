# @pylinks/sdk

> Official TypeScript/JavaScript SDK for integrating PYUSD payments via PyLinks

[![NPM Version](https://img.shields.io/npm/v/@pylinks/sdk)](https://www.npmjs.com/package/@pylinks/sdk)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

## Features

- ✅ Simple API for PYUSD payment integration
- ✅ Automatic QR code generation
- ✅ Real-time payment verification
- ✅ Webhook support
- ✅ TypeScript support with full type definitions
- ✅ Works in Node.js and browser environments
- ✅ Zero-config blockchain integration

## Installation

```bash
npm install @pylinks/sdk
# or
yarn add @pylinks/sdk
# or
bun add @pylinks/sdk
```

## Quick Start

### 1. Get Your API Key

Register at [PyLinks Dashboard](https://dashboard.pylinks.app) to get your API key.

### 2. Initialize the SDK

```typescript
import { PyLinks } from "@pylinks/sdk";

const pylinks = new PyLinks({
  apiKey: "pk_your_api_key_here",
  network: "sepolia", // or 'mainnet' for production
});
```

### 3. Create a Payment

```typescript
const payment = await pylinks.createPayment({
  amount: 10.5,
  description: "Premium Subscription",
  metadata: {
    orderId: "ORDER-123",
    userId: "USER-456",
  },
  webhookUrl: "https://yoursite.com/webhook",
});

console.log("Payment created:", payment.sessionId);
console.log("QR Code:", payment.qrCodeDataUrl);
```

### 4. Check Payment Status

```typescript
const status = await pylinks.getPaymentStatus(payment.sessionId);

if (status.status === "paid") {
  console.log("Payment confirmed!", status.txHash);
}
```

## API Reference

### Constructor

```typescript
new PyLinks(config: PyLinksConfig)
```

**Parameters:**

- `apiKey` (string, required) - Your PyLinks API key
- `network` (string, optional) - `'sepolia'` or `'mainnet'` (default: `'sepolia'`)
- `baseUrl` (string, optional) - Custom API base URL

### Methods

#### `createPayment(params)`

Create a new payment session.

```typescript
const payment = await pylinks.createPayment({
  amount: 10.5, // Payment amount in PYUSD
  description: "Product XYZ", // Optional description
  metadata: { orderId: "123" }, // Optional metadata
  webhookUrl: "https://...", // Optional webhook URL
  expiryMinutes: 30, // Optional expiry (default: 30)
});
```

**Returns:** `Promise<PaymentSession>`

```typescript
{
  sessionId: string;
  amount: number;
  currency: string;
  recipientAddress: string;
  status: "pending" | "paid" | "expired" | "failed";
  qrCode: string; // QR code data (JSON string)
  qrCodeDataUrl: string; // Base64 data URL for <img> tag
  expiresAt: string;
  createdAt: string;
}
```

#### `getPaymentStatus(sessionId)`

Get the current status of a payment session.

```typescript
const status = await pylinks.getPaymentStatus("session_abc123...");
```

**Returns:** `Promise<PaymentStatus>`

```typescript
{
  sessionId: string;
  status: 'pending' | 'paid' | 'expired' | 'failed';
  amount: number;
  txHash?: string;        // Available when status is 'paid'
  paidAt?: string;        // Available when status is 'paid'
}
```

#### `verifyPayment(sessionId)`

Manually trigger payment verification.

```typescript
const result = await pylinks.verifyPayment("session_abc123...");
```

**Returns:** `Promise<PaymentStatus>`

#### `listPayments(filters?)`

List all payment sessions for your merchant account.

```typescript
const payments = await pylinks.listPayments({
  status: "paid", // Optional: filter by status
  limit: 50, // Optional: number of results
  offset: 0, // Optional: pagination offset
});
```

**Returns:** `Promise<PaymentSession[]>`

## Usage Examples

### React Example

```tsx
import { PyLinks } from "@pylinks/sdk";
import { useState } from "react";

function CheckoutButton() {
  const [qrCode, setQrCode] = useState("");
  const pylinks = new PyLinks({ apiKey: "pk_..." });

  const handleCheckout = async () => {
    const payment = await pylinks.createPayment({
      amount: 29.99,
      description: "Premium Plan",
    });

    setQrCode(payment.qrCodeDataUrl);

    // Poll for payment status
    const interval = setInterval(async () => {
      const status = await pylinks.getPaymentStatus(payment.sessionId);
      if (status.status === "paid") {
        clearInterval(interval);
        alert("Payment successful!");
      }
    }, 3000);
  };

  return (
    <div>
      <button onClick={handleCheckout}>Pay with PYUSD</button>
      {qrCode && <img src={qrCode} alt="Payment QR" />}
    </div>
  );
}
```

### Node.js/Express Example

```typescript
import express from "express";
import { PyLinks } from "@pylinks/sdk";

const app = express();
const pylinks = new PyLinks({
  apiKey: process.env.PYLINKS_API_KEY!,
  network: "mainnet",
});

app.post("/create-payment", async (req, res) => {
  const payment = await pylinks.createPayment({
    amount: req.body.amount,
    description: req.body.description,
    webhookUrl: "https://yoursite.com/webhook",
  });

  res.json(payment);
});

app.post("/webhook", express.raw({ type: "application/json" }), (req, res) => {
  const event = req.body;

  if (event.eventType === "payment.paid") {
    console.log("Payment confirmed:", event.sessionId, event.txHash);
    // Fulfill order...
  }

  res.sendStatus(200);
});
```

### Next.js API Route Example

```typescript
// pages/api/payment.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { PyLinks } from "@pylinks/sdk";

const pylinks = new PyLinks({
  apiKey: process.env.PYLINKS_API_KEY!,
  network: "sepolia",
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === "POST") {
    try {
      const payment = await pylinks.createPayment({
        amount: req.body.amount,
        description: req.body.description,
      });

      res.status(200).json(payment);
    } catch (error) {
      res.status(500).json({ error: "Payment creation failed" });
    }
  } else {
    res.status(405).json({ error: "Method not allowed" });
  }
}
```

## Blockchain Verification

The SDK includes direct blockchain verification utilities:

```typescript
import { verifyPayment } from "@pylinks/sdk";

const result = await verifyPayment({
  sessionId: "session_123",
  recipient: "0x1234...",
  amount: 10.5,
});

if (result.status === "paid") {
  console.log("Transaction hash:", result.txHash);
}
```

## QR Code Utilities

Generate QR codes for payments:

```typescript
import { generateQRCodePayload } from "@pylinks/sdk";

const qrDataUrl = await generateQRCodePayload({
  sessionId: "session_123",
  recipient: "0x1234...",
  amount: 10.5,
  currency: "PYUSD",
});

// Use in HTML: <img src={qrDataUrl} />
```

## Error Handling

```typescript
import { PyLinks } from "@pylinks/sdk";

const pylinks = new PyLinks({ apiKey: "pk_..." });

try {
  const payment = await pylinks.createPayment({
    amount: 10.5,
  });
} catch (error) {
  if (error.response) {
    // API error
    console.error("API Error:", error.response.data.error);
  } else {
    // Network or other error
    console.error("Error:", error.message);
  }
}
```

## TypeScript Support

The SDK is written in TypeScript and includes full type definitions:

```typescript
import type {
  PyLinksConfig,
  PaymentSession,
  PaymentStatus,
  CreatePaymentParams,
} from "@pylinks/sdk";
```

## Environment Variables

For secure API key management:

```bash
# .env
PYLINKS_API_KEY=pk_your_api_key_here
PYLINKS_NETWORK=sepolia
```

```typescript
import { PyLinks } from "@pylinks/sdk";

const pylinks = new PyLinks({
  apiKey: process.env.PYLINKS_API_KEY!,
  network: process.env.PYLINKS_NETWORK as "sepolia" | "mainnet",
});
```

## Networks

### Testnet (Sepolia)

- Network: `sepolia`
- PYUSD Contract: `0xCaC524BcA292aaade2DF8A05cC58F0a65B1B3bB9`
- Use for development and testing

### Mainnet

- Network: `mainnet`
- PYUSD Contract: `0x6c3ea9036406852006290770bedfcaba0e23a0e8`
- Use for production

## Support

- 📚 [Documentation](https://docs.pylinks.app)
- 💬 [Discord Community](https://discord.gg/pylinks)
- 🐛 [Report Issues](https://github.com/vmmuthu31/PyLinks/issues)
- 📧 Email: support@pylinks.app

## License

MIT © PyLinks Team

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](../../CONTRIBUTING.md) for details.

---

Built with ❤️ for ETHGlobal Online 2025
