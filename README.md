# PyLinks - Seamless PYUSD Payment Infrastructure

> **ETHGlobal Online 2025 Hackathon Submission**

PyLinks is a comprehensive payment infrastructure platform that enables merchants and indie developers to easily integrate PayPal's PYUSD stablecoin into their applications, websites, and services. We're making Web3 payments as simple as scanning a QR code.

## Problem Statement

Merchants and indie developers face significant barriers when trying to integrate PYUSD payments:

- **Complex blockchain integration** requiring deep Web3 knowledge
- **No standardized SDK** or payment flow for PYUSD
- **Manual payment verification** is time-consuming and error-prone
- **Lack of merchant-friendly tools** (dashboards, webhooks, analytics)
- **Poor mobile payment UX** compared to traditional payment apps

## 💡 Solution

PyLinks provides a complete payment infrastructure stack that makes PYUSD integration as simple as adding a Stripe button:

### For Merchants

- 🔌 **Simple SDK Integration** - Add PYUSD payments in 3 lines of code
- 📱 **QR Code Checkout** - Generate payment QRs instantly
- 🔔 **Webhook Support** - Real-time payment notifications
- 📊 **Dashboard Analytics** - Track transactions, revenue, and users
- 🔑 **API Key Management** - Secure authentication system

### For Users

- 📲 **Mobile-First Experience** - Native iOS/Android app (React Native)
- 🔐 **Google Login** - No complex wallet setup required
- 📷 **Scan & Pay** - QR code-based checkout flow
- ⚡ **Instant Payments** - On-chain PYUSD transfers
- 📝 **Payment History** - Track all your transactions

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     PyLinks Platform                         │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  [Merchant SDK/API] ←→ [Backend Services] ←→ [Mobile App]   │
│         │                      │                    │         │
│         │                      │                    │         │
│    • NodeJS SDK          • Auth Service        • React       │
│    • REST API            • Payment Sessions     Native       │
│    • Webhooks            • QR Generator        • Wallet      │
│    • Plugins             • Blockchain Listener • Scan&Pay    │
│                          • Database                          │
│                                │                              │
│                                ↓                              │
│                    [PYUSD Smart Contract]                    │
│                      Ethereum Sepolia                         │
└─────────────────────────────────────────────────────────────┘
```

## 🚀 Key Features

### 1. **Merchant SDK** (`/sdk`)

```typescript
import { PyLinks } from "pylinks-sdk";

const payment = await PyLinks.createPayment({
  amount: 10,
  currency: "PYUSD",
  description: "Premium Subscription",
});

// Get QR code
const qrCode = await payment.getQRCode();
```

### 2. **Payment Session Management**

- Create unique payment sessions with expiry
- Real-time on-chain verification
- Webhook callbacks for payment events
- Session status tracking (pending, paid, expired)

### 3. **Blockchain Integration**

- **PYUSD Contract**: `0xCaC524BcA292aaade2DF8A05cC58F0a65B1B3bB9` (Sepolia)
- Event-based payment verification
- Transfer filtering and validation
- Multi-chain support ready (Mainnet, Sepolia)

### 4. **Mobile App** (`/mobile`)

- React Native + Expo
- Google OAuth integration
- Built-in wallet functionality
- QR scanner for payments
- Transaction history
- Push notifications

### 5. **Web Dashboard** (`/web`)

- Next.js 14+ with TypeScript
- Merchant analytics & reporting
- API key management
- Transaction explorer
- Real-time payment monitoring

## 📦 Project Structure

```
pylinks/
├── sdk/                    # TypeScript SDK for merchants
│   ├── src/
│   │   ├── pyusd.ts       # PYUSD contract interaction
│   │   ├── qr.ts          # QR code generation
│   │   └── types.ts       # TypeScript definitions
│   └── package.json
├── mobile/                 # React Native mobile app
│   ├── app/               # Expo Router pages
│   ├── components/        # Reusable UI components
│   └── package.json
├── web/                    # Next.js merchant dashboard
│   ├── app/               # App router pages
│   └── package.json
├── backend/                # Node.js API server
│   └── package.json
├── smart-contracts/        # Solidity contracts (Hardhat)
│   ├── contracts/
│   └── scripts/
└── README.md
```

## 🛠️ Tech Stack

### Frontend

- **Mobile**: React Native, Expo, TypeScript
- **Web**: Next.js 14, React, TailwindCSS
- **State**: React Hooks, Context API

### Backend

- **Runtime**: Node.js, TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL / MongoDB
- **Authentication**: JWT, OAuth 2.0

### Blockchain

- **Network**: Ethereum (Sepolia Testnet)
- **Contract**: PYUSD ERC-20 Token
- **Library**: ethers.js v5
- **Development**: Hardhat

### Infrastructure

- **QR Generation**: qrcode library
- **Webhooks**: Event-driven architecture
- **API**: RESTful + WebSocket support

## 🎬 Getting Started

### Prerequisites

```bash
node >= 18.x
npm >= 9.x
```

### Installation

1. **Clone the repository**

```bash
git clone https://github.com/yourusername/pylinks.git
cd pylinks
```

2. **Install dependencies for all packages**

```bash
# SDK
cd sdk && npm install

# Mobile
cd ../mobile && npm install

# Web
cd ../web && npm install

# Backend
cd ../backend && npm install

# Smart Contracts
cd ../smart-contracts && npm install
```

3. **Set up environment variables**

```bash
# Backend (.env)
ETH_RPC_SEPOLIA=your_sepolia_rpc_url
DATABASE_URL=your_database_url
JWT_SECRET=your_jwt_secret

# Mobile (.env)
EXPO_PUBLIC_API_URL=https://pylinks-backend.vercel.app
```

4. **Run development servers**

```bash
# Terminal 1 - Backend
cd backend && npm run dev

# Terminal 2 - Web Dashboard
cd web && npm run dev

# Terminal 3 - Mobile App
cd mobile && npx expo start
```

## 📱 Mobile App Demo

1. Open the Expo Go app on your device
2. Scan the QR code from the terminal
3. Login with Google
4. Scan a merchant's payment QR
5. Confirm and pay with PYUSD

## 💻 Merchant Integration Example

```typescript
// 1. Install SDK
npm install pylinks-sdk

// 2. Initialize
import { PyLinks } from 'pylinks-sdk';

const pylinks = new PyLinks({
  apiKey: 'your_api_key',
  network: 'sepolia'
});

// 3. Create Payment
const payment = await pylinks.createPayment({
  amount: 99.99,
  currency: 'PYUSD',
  description: 'Product XYZ',
  webhookUrl: 'https://yoursite.com/webhook'
});

// 4. Display QR or Button
<PayWithPYUSD qrData={payment.qrCode} />

// 5. Handle Webhook
app.post('/webhook', (req, res) => {
  const { sessionId, status, txHash } = req.body;
  if (status === 'paid') {
    // Fulfill order
  }
});
```

## 🔐 Security Features

- ✅ API key authentication
- ✅ Session-based payment tracking
- ✅ On-chain verification (no trust required)
- ✅ Webhook signature validation
- ✅ Rate limiting
- ✅ Input validation & sanitization

## 🧪 Testing

```bash
# Run SDK tests
cd sdk && npm test

# Run smart contract tests
cd smart-contracts && npx hardhat test

# Run backend tests
cd backend && npm test
```

## 🎯 ETHGlobal Online 2025 Highlights

### Innovation

- First unified PYUSD payment infrastructure
- Mobile-first approach for crypto payments
- Session-based payment tracking system

### Technical Excellence

- Type-safe SDK with full TypeScript support
- Event-driven blockchain verification
- Real-time webhook notifications

### User Experience

- QR code-based checkout (no wallet needed initially)
- Google login integration
- Merchant dashboard for analytics

### PYUSD Integration

- Direct integration with PYUSD smart contract
- Sepolia testnet deployment
- Production-ready mainnet support

## 🚧 Roadmap

- [ ] Multi-chain support (Polygon, Base, Arbitrum)
- [ ] Fiat on/off ramps integration
- [ ] Subscription payment support
- [ ] Shopify/WooCommerce plugins
- [ ] Payment links (no code required)
- [ ] Advanced analytics & reporting
- [ ] Dispute resolution system
- [ ] Multi-currency support

## 📄 Smart Contract Addresses

| Network | PYUSD Contract Address                       |
| ------- | -------------------------------------------- |
| Sepolia | `0xCaC524BcA292aaade2DF8A05cC58F0a65B1B3bB9` |
| Mainnet | `0x6c3ea9036406852006290770bedfcaba0e23a0e8` |

## 🤝 Contributing

We welcome contributions! Please see our contributing guidelines.

## 📝 License

MIT License - see LICENSE file for details

## 👥 Team

Built with ❤️ for ETHGlobal Online 2025

## 🔗 Links

- [Demo Video](https://youtu.be/your-demo)
- [Live Demo](https://pylinks.app)
- [Documentation](https://docs.pylinks.app)
- [Twitter](https://twitter.com/pylinks)

## 🏆 Acknowledgments

- PayPal for PYUSD
- ETHGlobal for the amazing hackathon
- Ethereum Foundation
- The Web3 community

---

**Made for ETHGlobal Online 2025** 🌍✨
