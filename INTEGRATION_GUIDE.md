# PyLinks Integration Guide 🚀

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER APPLICATIONS                        │
├──────────────────────┬──────────────────────────────────────────┤
│   Web App (Next.js)  │   Mobile App (React Native/Expo)        │
│   - Merchant Dashboard│   - Customer Payment UI                 │
│   - Payment Links    │   - QR Code Scanner                      │
│   - Analytics        │   - Wallet Connect                       │
└──────────────────────┴──────────────────────────────────────────┘
                              ↓ ↑
                    ┌─────────────────────┐
                    │   PyLinks SDK       │
                    │   (TypeScript)      │
                    └─────────────────────┘
                         ↓ ↑         ↓ ↑
            ┌────────────────┐   ┌──────────────────┐
            │    Backend     │   │  Smart Contracts │
            │   (Express)    │   │   (Sepolia)      │
            │                │   │                  │
            │ - API Keys     │   │ - PaymentEscrow  │
            │ - Sessions     │   │ - Recurring      │
            │ - Webhooks     │   │ - Splitter       │
            │ - MongoDB      │   │ - Pyth Oracle    │
            └────────────────┘   └──────────────────┘
                    ↓                      ↓
            ┌────────────────┐   ┌──────────────────┐
            │   Vercel       │   │  Ethereum        │
            │   Deployment   │   │  Sepolia + PYUSD │
            └────────────────┘   └──────────────────┘
```

---

## 🎯 User Flows for Hackathon Demo

### Flow 1: Basic Payment Link (Simple)

**Actors:** Merchant (Coffee Shop), Customer (Buyer)

**Scenario:** "Buy Coffee with PYUSD"

```
1. MERCHANT SETUP (Web App)
   ├─> Register at PyLinks Dashboard
   ├─> Generate API Key
   ├─> Create Payment Link: "$5 USD Coffee"
   └─> Get QR Code + Payment URL

2. CUSTOMER PAYMENT (Mobile App)
   ├─> Scan QR Code
   ├─> See: "Pay $5 USD (≈ 5.02 PYUSD)"  ← Pyth Oracle
   ├─> Connect Wallet (MetaMask/WalletConnect)
   ├─> Approve PYUSD Transfer
   └─> Payment Confirmed ✅

3. BACKEND PROCESSING
   ├─> Verify PYUSD Transfer (Blockchain)
   ├─> Update Session Status
   ├─> Send Webhook to Merchant
   └─> Merchant sees confirmation in dashboard
```

**Demo Script:**

```bash
# Terminal 1: Start Backend
cd backend && npm run dev

# Terminal 2: Start Web App
cd web && npm run dev

# Terminal 3: Start Mobile App
cd mobile && npm start
```

---

### Flow 2: Escrow Payment (Advanced)

**Scenario:** "Freelancer Work with Buyer Protection"

```
1. CLIENT CREATES ESCROW (Web)
   ├─> Login to PyLinks
   ├─> Create Payment: "$500 USD for Logo Design"
   ├─> Enable Escrow ✅
   ├─> Enable Auto-release (7 days) ✅
   └─> PYUSD locked in smart contract

2. FREELANCER DELIVERS WORK
   ├─> Uploads design files
   ├─> Requests payment release
   └─> Client gets notification

3. CLIENT OPTIONS
   ├─> ✅ Release Payment → Freelancer gets paid
   ├─> ⚠️  Dispute → Enters dispute resolution
   ├─> ⏰ Wait 7 days → Auto-release
   └─> 🔄 Refund (if agreed)

4. SMART CONTRACT HANDLES
   ├─> If Released: Transfer to merchant balance
   ├─> If Disputed: Lock until resolved
   └─> Freelancer withdraws via withdraw()
```

---

### Flow 3: Recurring Subscription (SaaS)

**Scenario:** "Netflix-style $10/month Subscription"

```
1. MERCHANT SETUP (Dashboard)
   ├─> Create Subscription Plan
   ├─> Name: "Premium Plan"
   ├─> Price: $10 USD/month
   ├─> Uses Pyth Dynamic Pricing ✅
   └─> Get subscription link

2. CUSTOMER SUBSCRIBES (Mobile)
   ├─> Click subscription link
   ├─> Approve unlimited PYUSD allowance
   ├─> First payment: ~10.01 PYUSD (current rate)
   └─> Subscription Active ✅

3. MONTHLY BILLING (Automated)
   ├─> Day 30: Backend calls processPayment()
   ├─> Smart contract gets fresh price from Pyth
   ├─> Charges: ~10.05 PYUSD (new rate)
   └─> Next payment: Day 60

4. CUSTOMER CAN
   ├─> Pause subscription
   ├─> Resume subscription
   └─> Cancel anytime
```

---

### Flow 4: Payment Splitting (Team Payments)

**Scenario:** "Split Revenue 60/30/10"

```
1. CREATE SPLIT CONFIG
   ├─> Recipients: [Alice, Bob, Charlie]
   ├─> Shares: [6000, 3000, 1000] (basis points)
   └─> Deploy split contract

2. RECEIVE PAYMENT
   ├─> Customer pays $100 USD
   └─> Auto-splits:
       ├─> Alice: $60
       ├─> Bob: $30
       └─> Charlie: $10

3. ALL PARTIES RECEIVE INSTANTLY
   └─> No manual distribution needed
```

---

## 💻 Code Integration Examples

### 1. Web App (Merchant Dashboard)

```typescript
// web/app/dashboard/page.tsx
import { PyLinksSDK } from "pylinks-sdk";

const sdk = new PyLinksSDK({
  apiKey: process.env.NEXT_PUBLIC_MERCHANT_API_KEY!,
  baseUrl: "https://pylinks-backend.vercel.app/api",
});

// Create Payment Link
async function createPaymentLink() {
  const payment = await sdk.createPayment({
    amount: 10.0, // $10 USD
    currency: "USD",
    description: "Coffee",
    webhookUrl: "https://myshop.com/webhook",
    useEscrow: false, // Direct payment
    expiresIn: 3600, // 1 hour
  });

  // Generate QR Code
  const qrCode = await sdk.generateQRCode(payment.sessionId);

  // Show payment URL
  const paymentUrl = `https://pay.pylinks.app/${payment.sessionId}`;

  return { qrCode, paymentUrl, payment };
}

// Listen for Webhooks
export async function POST(req: Request) {
  const webhook = await req.json();

  if (webhook.event === "payment.completed") {
    // Update order status
    await updateOrder(webhook.sessionId, "paid");

    // Send confirmation email
    await sendEmail(webhook.customerEmail, "Payment received!");
  }

  return Response.json({ received: true });
}
```

### 2. Mobile App (Customer Payment)

```typescript
// mobile/app/payment/[sessionId].tsx
import { PyLinksSDK } from "pylinks-sdk";
import { useWalletConnect } from "@walletconnect/react-native";
import { ethers } from "ethers";

export default function PaymentScreen({ sessionId }) {
  const { connector, address } = useWalletConnect();
  const sdk = new PyLinksSDK();

  async function handlePayment() {
    // 1. Get payment details
    const session = await sdk.getPaymentStatus(sessionId);

    // 2. Get current PYUSD amount (with Pyth pricing)
    const { pyusdAmount, usdAmount, currentPrice } = session;

    console.log(`Pay $${usdAmount} = ${pyusdAmount} PYUSD`);
    console.log(`Current rate: 1 PYUSD = $${currentPrice}`);

    // 3. Connect to contract
    const provider = new ethers.providers.Web3Provider(connector);
    const signer = provider.getSigner();

    const pyusdContract = new ethers.Contract(
      "0xCaC524BcA292aaade2DF8A05cC58F0a65B1B3bB9", // PYUSD Sepolia
      ["function transfer(address to, uint256 amount) returns (bool)"],
      signer
    );

    // 4. Send PYUSD
    const tx = await pyusdContract.transfer(
      session.merchantAddress,
      ethers.utils.parseUnits(pyusdAmount.toString(), 6) // 6 decimals
    );

    // 5. Wait for confirmation
    await tx.wait();

    // 6. Verify with backend
    const verified = await sdk.verifyPayment(sessionId, tx.hash);

    if (verified.status === "completed") {
      // Show success animation
      showSuccess();
    }
  }

  return (
    <View>
      <Text>Pay ${session.usdAmount} USD</Text>
      <Text>≈ {session.pyusdAmount} PYUSD</Text>
      <Button title="Pay Now" onPress={handlePayment} />
    </View>
  );
}
```

### 3. Using Smart Contracts Directly

```typescript
// For advanced features: Escrow, Subscriptions, Splits

import { ethers } from "ethers";

// Payment Escrow Contract
const escrowContract = new ethers.Contract(
  "DEPLOYED_ESCROW_ADDRESS",
  PaymentEscrowABI,
  signer
);

// Create escrowed payment
async function createEscrowPayment() {
  // 1. Get price update from Pyth Hermes
  const priceUpdate = await fetch(
    "https://hermes.pyth.network/api/latest_vaas?ids[]=PYUSD_FEED_ID"
  ).then((r) => r.json());

  // 2. Create payment with escrow
  const tx = await escrowContract.createPayment(
    merchantAddress,
    customerAddress,
    ethers.utils.parseUnits("100", 8), // $100 USD
    "session_12345",
    true, // useEscrow
    true, // autoRelease
    priceUpdate.data,
    { value: ethers.utils.parseEther("0.001") } // Pyth fee
  );

  const receipt = await tx.wait();
  const paymentId = receipt.events[0].args.paymentId;

  return paymentId;
}

// Release payment (after work delivered)
async function releaseEscrow(paymentId) {
  const tx = await escrowContract.releasePayment(paymentId);
  await tx.wait();
  console.log("Payment released to merchant!");
}

// Recurring Payments
const recurringContract = new ethers.Contract(
  "DEPLOYED_RECURRING_ADDRESS",
  RecurringPaymentsABI,
  signer
);

// Subscribe to monthly plan
async function subscribe() {
  const tx = await recurringContract.createSubscription(
    merchantAddress,
    ethers.utils.parseUnits("10", 8), // $10 USD
    30 * 24 * 60 * 60, // 30 days
    "premium_plan",
    true // useUsdPricing
  );

  await tx.wait();
}
```

---

## 🎬 Hackathon Demo Scenarios

### Scenario 1: Coffee Shop Demo (2 minutes)

**Setup:**

- Laptop: Merchant dashboard (web app)
- Phone: Customer payment (mobile app)
- Testnet: Pre-funded wallets

**Demo Flow:**

```
1. [Laptop] Login as "Joe's Coffee Shop"
2. [Laptop] Click "Create Payment Link"
3. [Laptop] Enter: $5 USD - "Cappuccino"
4. [Laptop] Show QR code on screen
5. [Phone] Open mobile app, scan QR
6. [Phone] Show: "Pay $5 = 5.01 PYUSD" (live price)
7. [Phone] Tap "Pay with MetaMask"
8. [Phone] Confirm transaction
9. [Laptop] Dashboard auto-updates: "Payment Received ✅"
10. [Laptop] Show webhook notification
```

**What This Shows:**
✅ Real-time USD to PYUSD conversion (Pyth)
✅ QR code payments
✅ Webhook integration
✅ Mobile + Web sync

---

### Scenario 2: Freelancer Escrow (3 minutes)

**Setup:**

- 2 Laptops OR split screen
- Testnet wallets for client & freelancer

**Demo Flow:**

```
1. [Client] Create escrow payment: "$500 - Logo Design"
2. [Client] Enable escrow + 7-day auto-release
3. [Client] Send payment → PYUSD locked in contract
4. [Freelancer] Receives notification
5. [Freelancer] Uploads work, requests release
6. [Client] Options shown:
   - ✅ Release (pays freelancer)
   - ⚠️ Dispute (locks payment)
   - ⏰ Wait (auto-release in 7 days)
7. [Client] Clicks "Release"
8. [Freelancer] Withdraws PYUSD
9. Show smart contract balance changes
```

**What This Shows:**
✅ Escrow protection
✅ Dispute resolution
✅ Smart contract security
✅ Auto-release mechanism

---

### Scenario 3: Subscription SaaS (2 minutes)

**Demo Flow:**

```
1. Create subscription: "$10/month Premium Plan"
2. Show Pyth price: 1 PYUSD = $1.00
3. Customer subscribes → Pays 10 PYUSD
4. [Fast forward] Change Pyth price to $0.98
5. Trigger next billing → Pays 10.20 PYUSD
6. Show: "Same $10 USD, different PYUSD amount"
7. Customer pauses subscription
8. Customer resumes subscription
```

**What This Shows:**
✅ Dynamic USD pricing
✅ Recurring payments
✅ Pyth oracle integration
✅ Subscription management

---

## 🏆 ETHGlobal Prize Eligibility

### ✅ Pyth Network ($3k)

**Requirement:** Use Pyth pull oracle

**Our Implementation:**

```typescript
// All payments use Pyth for PYUSD/USD pricing
1. Fetch price from Hermes API
2. Call updatePriceFeeds() on-chain
3. Get fresh price with getPriceUnsafe()
4. Calculate PYUSD amount dynamically
```

**Demo Points:**

- Show price fetching from Hermes
- Show on-chain price update
- Show USD → PYUSD conversion
- Show price changes affecting payment amounts

---

### ✅ Blockscout ($7k total)

**Prize 1:** Deploy Blockscout instance ($3.5k)

```bash
# Deploy PyLinks explorer
1. Go to https://deploy.blockscout.com/
2. Request credits in Discord
3. Deploy for Sepolia testnet
4. Add all contract addresses
5. Show in demo: "Our custom explorer"
```

**Prize 2:** Integrate SDK ($2k)

```typescript
// Use Blockscout API in web app
import { BlockscoutSDK } from "@blockscout/sdk";

const explorer = new BlockscoutSDK({
  network: "sepolia",
  instance: "pylinks.blockscout.com",
});

// Show transaction history
const txs = await explorer.getTransactions(merchantAddress);

// Show in dashboard
<TransactionList transactions={txs} />;
```

**Prize 3:** MCP Prompts ($1.25k)
Create comprehensive prompts:

```
1. "Show all PYUSD payments for merchant 0x..."
2. "Analyze payment patterns in last 30 days"
3. "Find failed transactions and reasons"
4. "Track escrow payments by status"
```

---

## 📦 Deployment Checklist

### Backend (Vercel)

```bash
cd backend
vercel --prod

# Set environment variables:
MONGODB_URI=mongodb+srv://...
PYUSD_CONTRACT=0xCaC524BcA292aaade2DF8A05cC58F0a65B1B3bB9
SEPOLIA_RPC=https://ethereum-sepolia-rpc.publicnode.com
```

### Smart Contracts (Sepolia)

```bash
cd smart-contracts
npm run deploy:all:sepolia

# Note deployed addresses:
PaymentEscrow: 0x...
RecurringPayments: 0x...
PaymentSplitter: 0x...
```

### SDK (NPM)

```bash
cd sdk
npm version patch
npm publish

# Update in apps:
npm install pylinks-sdk@latest
```

### Web App (Vercel)

```bash
cd web
vercel --prod

# Environment variables:
NEXT_PUBLIC_API_URL=https://pylinks-backend.vercel.app/api
NEXT_PUBLIC_CHAIN_ID=11155111
NEXT_PUBLIC_ESCROW_CONTRACT=0x...
```

### Mobile App (Expo)

```bash
cd mobile
eas build --platform all
eas submit --platform all

# Update app.json:
EXPO_PUBLIC_API_URL=https://pylinks-backend.vercel.app/api
```

---

## 🎥 Demo Video Script (4 minutes)

### Introduction (30 sec)

```
"Hi! I'm presenting PyLinks - a complete PYUSD payment
infrastructure with dynamic pricing, escrow protection,
and recurring subscriptions.

Let me show you how it works..."
```

### Demo 1: Coffee Shop (60 sec)

```
"Here's a coffee shop merchant dashboard. They want to
charge $5 for a cappuccino. Watch as I create a payment
link... [create] ...and here's the QR code.

Now on my phone, I scan this QR code. Notice it shows
$5 USD equals 5.01 PYUSD - that's using Pyth Network's
real-time price oracle. I pay with MetaMask... and boom!
The merchant dashboard instantly shows payment received.
They also got a webhook notification."
```

### Demo 2: Escrow (60 sec)

```
"But what about buyer protection? Here's a freelancer
scenario. Client creates a $500 escrow payment for logo
design. The PYUSD is locked in our smart contract, not
sent to freelancer yet.

Freelancer delivers work and requests release. Client
has options: release payment, dispute, or wait 7 days
for auto-release. Client clicks release, and freelancer
can now withdraw. This is all on-chain, trustless."
```

### Demo 3: Subscriptions (60 sec)

```
"Finally, recurring payments. Create a $10/month plan
with dynamic USD pricing. Customer subscribes, pays
10 PYUSD today at $1 rate.

Next month, if PYUSD price drops to $0.98, they
automatically pay 10.20 PYUSD to maintain the same
$10 USD value. This is perfect for SaaS businesses
who need predictable USD revenue."
```

### Conclusion (30 sec)

```
"PyLinks solves real problems: merchants get stable
USD pricing, customers get escrow protection, and
everyone benefits from automated subscriptions.

We're using Pyth Network for live pricing, deployed
on Blockscout for transparency, and built a complete
SDK for easy integration.

Thank you!"
```

---

## 🚀 Quick Start Commands

```bash
# 1. Install SDK in any app
npm install pylinks-sdk

# 2. Initialize
import { PyLinksSDK } from 'pylinks-sdk';
const sdk = new PyLinksSDK({ apiKey: 'YOUR_KEY' });

# 3. Create payment
const payment = await sdk.createPayment({
  amount: 10,
  currency: 'USD',
  description: 'Test payment'
});

# 4. Get QR code
const qr = await sdk.generateQRCode(payment.sessionId);

# 5. Verify payment
const status = await sdk.verifyPayment(sessionId, txHash);
```

---

## 📚 Additional Resources

- **Backend API Docs:** `/backend/API.md`
- **SDK Docs:** `/sdk/README.md`
- **Smart Contracts:** `/smart-contracts/README.md`
- **Live API:** https://pylinks-backend.vercel.app
- **Demo Video:** [Upload to YouTube]
- **GitHub:** https://github.com/vmmuthu31/PyLinks

---

**Built for ETHGlobal Online 2025** 🏆
