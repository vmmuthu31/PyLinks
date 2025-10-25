# PyLinks Mobile App - User Flows

## Overview
PyLinks is a PYUSD payment application that enables seamless crypto payments using QR codes, payment links, and smart contracts. This document outlines the complete user flows for consumers and merchants.

---

## 1. Initial Setup Flow

### First-Time User (Create Wallet)
```
📱 Open App
  ↓
🏠 Welcome Screen
  ↓
➕ "Create New Wallet" Button
  ↓
🔐 Wallet Generated
  ↓
⚠️ Recovery Phrase Displayed (12-word mnemonic)
  - User MUST save this securely
  - Option to copy to clipboard
  ↓
✅ Wallet Created
  ↓
🏠 Home Dashboard (shows 0 balance)
```

### Returning User (Import Wallet)
```
📱 Open App
  ↓
🏠 Welcome Screen
  ↓
📥 "Import Wallet" Button
  ↓
🔑 Enter Private Key or Mnemonic
  ↓
✅ Wallet Imported
  ↓
🏠 Home Dashboard (shows existing balance)
```

---

## 2. Getting Testnet Funds

### For Testing on Sepolia
```
🏠 Home Dashboard
  ↓
📋 Tap "Copy Address"
  ↓
🌐 Visit Faucets:
  - ETH: https://sepoliafaucet.com/
  - PYUSD: https://faucet.circle.com/
  ↓
💰 Request Testnet Tokens
  ↓
⏳ Wait 1-2 minutes
  ↓
🔄 Pull to Refresh on Home Screen
  ↓
✅ Balance Updated
```

---

## 3. Consumer Payment Flows

### Flow A: Pay via QR Code Scan (Merchant POS)

**Scenario**: Buying coffee at a café that accepts PYUSD

```
🏠 Customer Dashboard
  ↓
📷 Tap "Scan QR" Button
  ↓
📸 Camera Opens (expo-camera)
  - Allow camera permission if first time
  ↓
🔍 Scan Merchant's QR Code
  - QR contains: pylinks://pay?session=abc123
  ↓
💳 Payment Confirmation Screen
  - Shows: Merchant name
  - Amount: $5.00 (5 PYUSD)
  - Item: "Latte"
  - Memo: "Payment for Latte"
  ↓
👆 Tap "Confirm Payment"
  ↓
🔄 Processing:
  1. Fetch payment session from backend
  2. Validate merchant and amount
  3. Send PYUSD transaction on-chain
  4. Wait for confirmation (1-2 blocks)
  5. Verify payment with backend
  ↓
✅ Payment Successful
  - Transaction hash displayed
  - "View on Blockscout" link
  - Receipt saved locally
  ↓
🏠 Return to Dashboard
  - Balance updated
  - Transaction appears in history
```

**Backend Flow**:
```
API: GET /api/payments/session/:sessionId
  ↓
Customer sends PYUSD to merchant address
  ↓
API: POST /api/payments/verify
  - Backend checks blockchain for tx
  ↓
Webhook: POST merchant.com/webhook
  - Merchant notified of payment
  ↓
API: POST /api/payments/record
  - Payment recorded for merchant's records
```

### Flow B: Pay via Payment Link (Online Shopping)

**Scenario**: Buying digital product online

```
🌐 Customer browses merchant website
  ↓
🛒 Adds item to cart ($10)
  ↓
💳 Clicks "Pay with PYUSD"
  ↓
🔗 Merchant generates payment link:
  - https://pylinks.app/pay?session=xyz789
  ↓
📱 Customer clicks link (deep linking)
  ↓
📲 PyLinks App Opens Automatically
  ↓
💳 Payment Confirmation Screen (same as QR flow)
  ↓
✅ Payment Completed
  ↓
🌐 Redirected back to merchant website
  - Shows "Payment Successful" page
```

### Flow C: Direct Send (Peer-to-Peer)

**Scenario**: Sending PYUSD to a friend

```
🏠 Home Dashboard
  ↓
📤 Tap "Send" Button
  ↓
📝 Enter Payment Details:
  - Recipient Address: 0xABC...
  - Amount: 10 PYUSD
  - Memo: "Lunch money"
  ↓
⛽ Gas Estimate Displayed
  - Network fee: ~0.001 ETH
  ↓
👆 Tap "Send Payment"
  ↓
🔄 Processing Transaction
  ↓
✅ Payment Sent
  - Tx hash: 0x123...
  - View on explorer
```

---

## 4. Merchant Receiving Flows

### Flow A: Generate Payment QR (Point of Sale)

**Scenario**: Café accepting payment

```
🏪 Merchant Dashboard
  ↓
💰 Tap "Request Payment"
  ↓
📝 Enter Payment Details:
  - Amount: 5 PYUSD
  - Item: "Latte"
  - Note: "Order #123"
  ↓
🔄 Backend creates payment session
  - POST /api/payments
  - Returns sessionId
  ↓
📱 QR Code Generated
  - Data: pylinks://pay?session=abc123
  - Displayed on merchant's tablet
  ↓
⏳ Waiting for payment...
  - Screen shows "Scan to Pay"
  - Timer: 30 minutes expiration
  ↓
👤 Customer scans QR
  ↓
✅ Payment Received!
  - Push notification to merchant
  - Screen shows "Payment Complete"
  - Tx hash displayed
  - Receipt can be printed/emailed
```

### Flow B: Share Payment Link (Online/Remote)

**Scenario**: Freelancer requesting payment

```
💼 Freelancer Dashboard
  ↓
💰 Tap "Request Payment"
  ↓
📝 Enter Details:
  - Amount: 100 PYUSD
  - Service: "Logo Design"
  - Client: "ABC Corp"
  ↓
🔗 Payment Link Generated
  - https://pylinks.app/pay?session=xyz789
  ↓
📧 Share via:
  - Email
  - WhatsApp
  - SMS
  - Copy link
  ↓
⏳ Waiting for payment...
  ↓
✅ Payment received notification
  - View transaction details
```

### Flow C: View Payment History

```
🏪 Merchant Dashboard
  ↓
📝 Tap "Transaction History"
  ↓
📊 List of Payments:
  - Date/Time
  - Amount
  - Customer (wallet address)
  - Status (success/pending/failed)
  - Tx hash (tap to view on explorer)
  ↓
🔍 Filter Options:
  - Date range
  - Status
  - Amount
  ↓
📥 Export:
  - CSV download
  - Email report
```

---

## 5. Advanced Features

### Flow A: Escrow Payment (Protected Payment)

**Scenario**: Buying NFT with escrow protection

```
🛍️ Customer Dashboard
  ↓
🔒 Tap "Pay with Escrow"
  ↓
📝 Enter Details:
  - Seller: 0xSELLER...
  - Amount: 50 PYUSD
  - Description: "NFT Purchase"
  - Unlock condition: "Manual release after delivery"
  ↓
🔄 Smart Contract Interaction:
  1. Approve PYUSD spending
  2. Create escrow (calls PaymentEscrow.sol)
  3. Funds locked in contract
  ↓
✅ Escrow Created
  - Escrow ID: #123
  - Status: "Locked"
  ↓
📦 Seller delivers NFT
  ↓
🔓 Customer Actions:
  Option A: Release Payment
    ↓
    ✅ Funds sent to seller
    ↓
    Status: "Released"
  
  Option B: Dispute
    ↓
    ⚠️ Dispute opened
    ↓
    🧑‍⚖️ Arbitrator reviews
    ↓
    Decision: Release or Refund
```

### Flow B: Recurring Payment (Subscription)

**Scenario**: Monthly gym membership

```
💪 Gym Member Dashboard
  ↓
🔄 Tap "Subscribe"
  ↓
📝 Subscription Details:
  - Gym: "FitLife"
  - Amount: 30 PYUSD/month
  - Duration: 12 months
  - Start: Immediate
  ↓
✅ Approve Subscription:
  1. Approve PYUSD spending (360 PYUSD)
  2. Create subscription (RecurringPayments.sol)
  ↓
📅 Subscription Active
  - Next payment: Jan 1
  - Remaining: 11 payments
  ↓
🔄 Auto-Charge Every Month:
  - Gym calls executePayment()
  - 30 PYUSD deducted
  - Notification sent to user
  ↓
❌ Cancel Subscription:
  - Tap "Cancel Subscription"
  - Remaining balance refunded
```

### Flow C: Payment Splitting

**Scenario**: Group dinner bill split

```
🍽️ Group Dinner
  ↓
💰 Total Bill: 100 PYUSD
  ↓
📱 One person creates split:
  - Split between 4 people
  - Each pays 25 PYUSD
  ↓
🔗 Share Payment Link:
  - pylinks://split?id=xyz
  ↓
👥 Each friend:
  1. Opens link
  2. Sees their portion (25 PYUSD)
  3. Pays their share
  ↓
🔄 Smart Contract:
  - Collects all 4 payments
  - Automatically distributes to restaurant
  ↓
✅ All Paid
  - Everyone receives receipt
```

---

## 6. Receive Payment Flow

### QR Code Display
```
🏠 Home Dashboard
  ↓
📥 Tap "Receive"
  ↓
📱 Receive Screen:
  - Shows QR code with your address
  - Wallet address displayed (tap to copy)
  - Share button
  ↓
📤 Share Options:
  - WhatsApp
  - Email
  - SMS
  - Copy address
```

---

## 7. Transaction History

```
🏠 Home Dashboard
  ↓
📝 Tap "Transaction History"
  ↓
📊 List View:
  - Sent (red arrow ↑)
  - Received (green arrow ↓)
  - Each shows:
    * Amount
    * Date/Time
    * From/To address
    * Status (confirmed/pending)
  ↓
👆 Tap Transaction
  ↓
📄 Transaction Details:
  - Tx Hash
  - Block number
  - Gas used
  - Memo/Note
  - "View on Blockscout" button
```

---

## 8. Error Handling

### Insufficient Balance
```
💳 User tries to pay 100 PYUSD
  ↓
❌ Balance check fails (only 50 PYUSD)
  ↓
⚠️ Error: "Insufficient PYUSD balance"
  - Shows current balance
  - "Get PYUSD" button → faucet link
```

### Insufficient Gas
```
💳 User tries to pay
  ↓
❌ Gas check fails (no ETH)
  ↓
⚠️ Error: "Insufficient ETH for gas"
  - "Get ETH" button → faucet link
```

### Transaction Failed
```
💳 Payment initiated
  ↓
❌ Blockchain tx reverts
  ↓
⚠️ Error: "Transaction failed"
  - Reason displayed (e.g., "Insufficient allowance")
  - "Try Again" button
```

### Network Issues
```
💳 Payment initiated
  ↓
❌ Network timeout
  ↓
⚠️ Error: "Network error"
  - "Retry" button
  - "Check transaction status" option
```

---

## 9. Security Features

### Biometric Authentication
```
🔐 Before sensitive actions:
  - Sending payments
  - Viewing private key
  - Exporting wallet
  ↓
👆 Face ID / Touch ID / PIN prompt
  ↓
✅ Authenticated → proceed
❌ Failed → block action
```

### Session Management
```
⏰ After 15 minutes inactivity
  ↓
🔒 App locked
  ↓
🔐 Re-authenticate to unlock
```

---

## 10. Settings & Account Management

```
🏠 Home Dashboard
  ↓
⚙️ Tap "Settings"
  ↓
📋 Settings Menu:
  - View Recovery Phrase (requires auth)
  - Export Private Key (requires auth)
  - Change Currency (USD/EUR)
  - Network Settings (Sepolia/Mainnet)
  - Notifications (on/off)
  - Support & Help
  - About
  - Logout (clears wallet)
```

---

## Key Navigation Paths

### Primary Navigation (Bottom Tabs)
- **Home**: Balance, Quick Actions
- **Pay**: Send, Scan QR
- **Receive**: QR Code, Address
- **History**: Transaction List
- **More**: Settings, Help

### Quick Actions (Home Screen)
- Send Payment
- Scan QR
- Receive
- Transaction History
- Settings

---

## Technical Implementation Notes

### Deep Linking Scheme
- `pylinks://pay?session={sessionId}` - Payment
- `pylinks://split?id={splitId}` - Split payment
- `pylinks://escrow?id={escrowId}` - Escrow details
- `pylinks://sub?id={subId}` - Subscription details

### State Management
- **WalletContext**: Global wallet state (address, balances)
- **PaymentContext**: Active payment sessions
- **HistoryContext**: Transaction cache

### Data Persistence
- **SecureStore**: Private keys, mnemonics
- **AsyncStorage**: Transaction history, settings
- **Backend**: Payment sessions, merchant data

### Background Tasks
- Balance refresh (every 30s when app active)
- Transaction status polling (pending txs)
- Webhook listener (payment notifications)

---

This comprehensive flow ensures users can easily navigate all features while maintaining security and providing a smooth UX for both consumers and merchants.
