# PyLinks Backend - Quick Start with Bun 🚀

## Prerequisites

- Bun >= 1.0
- MongoDB running locally or connection string
- Ethereum RPC endpoint (Alchemy, Infura, etc.)

## Installation

```bash
# Install dependencies
bun install
```

## Environment Setup

1. Copy the example env file:

```bash
cp .env.example .env
```

2. Update `.env` with your values:

```env
# Server
PORT=3000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/pylinks

# Blockchain (Get from Alchemy/Infura)
ETH_RPC_SEPOLIA=https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY

# Auth
JWT_SECRET=your-super-secret-jwt-key-change-this

# Webhook
WEBHOOK_SECRET=your-webhook-signing-secret
```

## Running the Backend

### Development Mode (with hot reload)

```bash
bun run dev
```

### Production Build

```bash
bun run build
bun run start
```

## Testing the API

### 1. Register a Merchant

```bash
curl -X POST http://localhost:3000/api/merchants/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Store",
    "email": "test@example.com",
    "businessName": "Test LLC",
    "walletAddress": "0x1234567890123456789012345678901234567890"
  }'
```

Save the `apiKey` from the response!

### 2. Create a Payment

```bash
curl -X POST http://localhost:3000/api/payments/create \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 10.50,
    "description": "Test Payment",
    "metadata": { "orderId": "ORDER-123" }
  }'
```

### 3. Check Payment Status

```bash
curl http://localhost:3000/api/payments/SESSION_ID
```

## Project Structure

```
backend/
├── src/
│   ├── index.ts              # Main entry point
│   ├── config/
│   │   └── index.ts          # Configuration
│   ├── models/
│   │   ├── Merchant.ts       # Merchant schema
│   │   ├── PaymentSession.ts # Payment session schema
│   │   └── Transaction.ts    # Transaction schema
│   ├── services/
│   │   ├── payment-session.service.ts  # Payment logic
│   │   ├── webhook.service.ts          # Webhook handling
│   │   └── blockchain-listener.ts      # PYUSD event listener
│   ├── routes/
│   │   ├── payment.routes.ts
│   │   ├── merchant.routes.ts
│   │   └── webhook.routes.ts
│   ├── middleware/
│   │   ├── auth.ts           # API key authentication
│   │   ├── error-handler.ts  # Error handling
│   │   └── validation.ts     # Request validation
│   ├── utils/
│   │   ├── crypto.ts         # Crypto utilities
│   │   └── logger.ts         # Logging
│   └── types/
│       └── index.ts          # TypeScript types
├── .env.example
├── package.json
└── tsconfig.json
```

## API Endpoints

### Merchants

- `POST /api/merchants/register` - Register new merchant
- `GET /api/merchants/profile` - Get merchant profile
- `POST /api/merchants/rotate-key` - Rotate API key

### Payments

- `POST /api/payments/create` - Create payment session
- `GET /api/payments/:sessionId` - Get payment status
- `POST /api/payments/:sessionId/verify` - Verify payment
- `GET /api/payments/merchant/sessions` - List merchant payments

### Webhooks

- Automatic webhooks sent on payment status changes
- Events: `payment.created`, `payment.paid`, `payment.expired`, `payment.failed`

## Database Models

### Merchant

- name, email, businessName
- walletAddress (receives PYUSD)
- apiKeyHash (hashed for security)
- statistics (totalPayments, totalVolume)

### PaymentSession

- sessionId (unique identifier)
- merchantId, amount, currency
- status (pending, paid, expired, failed)
- recipientAddress, txHash
- QR code data
- expiry tracking

### Transaction

- sessionId, merchantId
- txHash, blockNumber
- from, to, amount
- timestamp, confirmations

## Blockchain Integration

The backend automatically listens for PYUSD transfer events:

1. User scans QR and pays with mobile app
2. Transaction is sent to blockchain
3. Blockchain listener detects the transfer
4. Payment session is updated to "paid"
5. Webhook is triggered to merchant's URL

## Security Features

✅ API key authentication (hashed storage)
✅ Webhook signature verification
✅ Rate limiting (100 req/15min)
✅ Input validation
✅ Session expiry
✅ On-chain verification

## Troubleshooting

### MongoDB Connection Error

```bash
# Make sure MongoDB is running
brew services start mongodb-community
# or
mongod --dbpath /path/to/data
```

### RPC Connection Error

- Check your Alchemy/Infura API key
- Verify the RPC URL in `.env`
- Ensure you have credits/quota

### Port Already in Use

```bash
# Change PORT in .env or kill the process
lsof -ti:3000 | xargs kill -9
```

## Development Tips

### Hot Reload

Bun's watch mode automatically reloads on file changes:

```bash
bun run dev
```

### Type Checking

```bash
bun run typecheck
```

### Check Logs

The logger provides colored output:

- ℹ️ INFO - General information
- ⚠️ WARN - Warnings
- ❌ ERROR - Errors
- 🐛 DEBUG - Debug info (dev only)

## Next Steps

1. ✅ Backend setup complete
2. 📱 Integrate with mobile app
3. 🌐 Connect with web dashboard
4. 📦 Deploy SDK for merchants

## Support

- Full API docs: See `API.md`
- Issues: Create a GitHub issue
- Questions: Join our Discord

---

Built with ❤️ using Bun for ETHGlobal Online 2025
