# PyLinks Smart Contracts

Smart contracts for advanced PYUSD payment infrastructure on Ethereum/Optimism.

## Contracts

### 1. PaymentEscrow.sol

**Purpose**: Secure escrow for PYUSD payments with buyer protection

**Features**:

- Hold payments in escrow for a configurable period (default 7 days)
- Auto-release to merchant after escrow period
- Buyer-initiated disputes within 14 days
- Merchant-initiated refunds
- Secure fund management

**Use Cases**:

- Freelance work payments
- E-commerce with buyer protection
- Service-based payments
- High-value transactions

**Key Functions**:

```solidity
createPayment(merchant, amount, sessionId, autoRelease) → paymentId
releasePayment(paymentId)
disputePayment(paymentId)
refundPayment(paymentId)
withdraw()
```

### 2. RecurringPayments.sol

**Purpose**: Subscription-based recurring PYUSD payments

**Features**:

- Create subscription plans with custom intervals
- Automatic payment processing
- Pause/resume subscriptions
- Subscriber and merchant management
- Allowance-based payments

**Use Cases**:

- SaaS subscriptions
- Monthly memberships
- Recurring donations
- Service retainers

**Key Functions**:

```solidity
createSubscription(merchant, amount, interval, planId) → subscriptionId
processPayment(subscriptionId)
cancelSubscription(subscriptionId)
pauseSubscription(subscriptionId)
resumeSubscription(subscriptionId)
```

### 3. PaymentSplitter.sol

**Purpose**: Automatically split payments among multiple recipients

**Features**:

- Define custom split percentages (basis points)
- Multi-recipient payments in one transaction
- Revenue sharing automation
- Configurable split rules

**Use Cases**:

- Team revenue sharing
- Platform fees + merchant payments
- Affiliate commission splits
- Multi-party transactions

**Key Functions**:

```solidity
createSplit(recipients[], shares[]) → splitId
executeSplit(splitId, amount)
deactivateSplit(splitId)
```

## Deployment

### Prerequisites

```bash
npm install
# or
bun install
```

### Environment Setup

Create `.env` file:

```bash
PRIVATE_KEY=your_private_key_here
INFURA_API_KEY=your_infura_key_here
ETHERSCAN_API_KEY=your_etherscan_key_here
```

### Deploy to Sepolia Testnet

```bash
# Compile contracts
npx hardhat compile

# Deploy PaymentEscrow
npx hardhat run scripts/deploy-escrow.ts --network sepolia

# Deploy RecurringPayments
npx hardhat run scripts/deploy-recurring.ts --network sepolia

# Deploy PaymentSplitter
npx hardhat run scripts/deploy-splitter.ts --network sepolia
```

### PYUSD Contract Addresses

- **Sepolia**: `0xCaC524BcA292aaade2DF8A05cC58F0a65B1B3bB9`
- **Ethereum Mainnet**: `0x6c3ea9036406852006290770BEdfcAbA0e23A0e8`

## Testing

```bash
# Run all tests
npx hardhat test

# Run specific test
npx hardhat test test/PaymentEscrow.test.ts

# Run with coverage
npx hardhat coverage
```

## Verification

Verify contracts on Etherscan:

```bash
npx hardhat verify --network sepolia DEPLOYED_CONTRACT_ADDRESS "PYUSD_ADDRESS"
```

## Integration with PyLinks Backend

These contracts extend PyLinks functionality:

1. **Escrow Integration**: Backend can create escrow payments for high-value transactions
2. **Subscription Plans**: Recurring payments for SaaS merchants
3. **Revenue Sharing**: Split payments between platform and merchants

### Example Integration

```typescript
import { ethers } from "ethers";

// Connect to PaymentEscrow
const escrow = new ethers.Contract(ESCROW_ADDRESS, PaymentEscrowABI, signer);

// Create escrowed payment
const tx = await escrow.createPayment(
  merchantAddress,
  amount,
  sessionId,
  true // auto-release
);

const receipt = await tx.wait();
const paymentId = receipt.events[0].args.paymentId;
```

## Security

- All contracts use OpenZeppelin patterns
- Reentrancy protection
- Access control modifiers
- Tested for common vulnerabilities

## Gas Optimization

- Efficient storage patterns
- Minimal external calls
- Batch operations where possible

## License

MIT

## Contributing

1. Fork the repository
2. Create your feature branch
3. Write tests for new functionality
4. Submit a pull request

## Contract Addresses

Will be updated after deployment:

```
Sepolia Testnet:
- PaymentEscrow: TBD
- RecurringPayments: TBD
- PaymentSplitter: TBD

Ethereum Mainnet:
- PaymentEscrow: TBD
- RecurringPayments: TBD
- PaymentSplitter: TBD
```

## Audit Status

⚠️ **Not audited** - These contracts are for hackathon/demonstration purposes.
Do not use in production without a professional security audit.

## Support

- GitHub Issues: https://github.com/vmmuthu31/PyLinks/issues
- Documentation: https://github.com/vmmuthu31/PyLinks
