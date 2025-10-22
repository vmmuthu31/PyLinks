import { ethers } from "ethers";
import PYUSD_ABI from "../../../sdk/src/PYUSD.abi.json";
import { PaymentSession, PaymentStatus } from "../models/PaymentSession";
import { Transaction } from "../models/Transaction";
import { WebhookService } from "./webhook.service";

const PYUSD_CONTRACT =
  process.env.PYUSD_CONTRACT || "0xCaC524BcA292aaade2DF8A05cC58F0a65B1B3bB9";
const RPC_URL = process.env.ETH_RPC_SEPOLIA || "";

let isListening = false;

/**
 * Start listening to blockchain events for PYUSD transfers
 */
export function startBlockchainListener(): void {
  if (isListening) {
    console.log("⚠️  Blockchain listener already running");
    return;
  }

  if (!RPC_URL) {
    console.error("❌ ETH_RPC_SEPOLIA not configured");
    return;
  }

  const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
  const contract = new ethers.Contract(PYUSD_CONTRACT, PYUSD_ABI, provider);

  console.log("🎧 Starting blockchain listener...");
  console.log(`📡 Listening to PYUSD contract: ${PYUSD_CONTRACT}`);

  contract.on("Transfer", async (from, to, value, event) => {
    try {
      console.log("\n💰 New PYUSD Transfer detected:");
      console.log(`   From: ${from}`);
      console.log(`   To: ${to}`);
      console.log(`   Amount: ${ethers.utils.formatUnits(value, 6)} PYUSD`);
      console.log(`   TxHash: ${event.transactionHash}`);

      await handleTransferEvent(from, to, value, event);
    } catch (error) {
      console.error("❌ Error handling transfer event:", error);
    }
  });

  setInterval(() => {
    scanRecentTransfers(provider, contract);
  }, 5 * 60 * 1000);

  isListening = true;
  console.log("✅ Blockchain listener started successfully\n");
}

/**
 * Handle a Transfer event
 */
async function handleTransferEvent(
  from: string,
  to: string,
  value: ethers.BigNumber,
  event: ethers.Event
): Promise<void> {
  const amountInPYUSD = parseFloat(ethers.utils.formatUnits(value, 6));

  const sessions = await PaymentSession.find({
    recipientAddress: to.toLowerCase(),
    amount: amountInPYUSD,
    status: PaymentStatus.PENDING,
    expiresAt: { $gt: new Date() },
  });

  if (sessions.length === 0) {
    console.log("ℹ️  No matching payment session found");
    return;
  }

  const block = await event.getBlock();

  for (const session of sessions) {
    console.log(`✅ Payment verified for session: ${session.sessionId}`);

    await PaymentSession.updateOne(
      { _id: session._id },
      {
        status: PaymentStatus.PAID,
        txHash: event.transactionHash,
        blockNumber: event.blockNumber,
        paidAt: new Date(),
      }
    );

    await Transaction.create({
      txHash: event.transactionHash,
      sessionId: session.sessionId,
      merchantId: session.merchantId,
      from: from.toLowerCase(),
      to: to.toLowerCase(),
      amount: value.toString(),
      blockNumber: event.blockNumber,
      timestamp: new Date(block.timestamp * 1000),
      status: "confirmed",
    });

    const updatedSession = await PaymentSession.findById(session._id);
    if (updatedSession) {
      await WebhookService.triggerPaymentWebhook(
        updatedSession,
        "payment.paid"
      );
    }

    console.log(`🔔 Webhook triggered for session: ${session.sessionId}\n`);
  }
}

/**
 * Scan recent transfers (fallback for missed events)
 */
async function scanRecentTransfers(
  provider: ethers.providers.JsonRpcProvider,
  contract: ethers.Contract
): Promise<void> {
  try {
    console.log("🔍 Scanning recent transfers...");

    const currentBlock = await provider.getBlockNumber();
    const fromBlock = currentBlock - 1000;

    const pendingSessions = await PaymentSession.find({
      status: PaymentStatus.PENDING,
      expiresAt: { $gt: new Date() },
    });

    if (pendingSessions.length === 0) {
      return;
    }

    const recipients = [
      ...new Set(pendingSessions.map((s) => s.recipientAddress)),
    ];

    for (const recipient of recipients) {
      const filter = contract.filters.Transfer(null, recipient);
      const events = await contract.queryFilter(
        filter,
        fromBlock,
        currentBlock
      );

      for (const event of events) {
        if (event.args) {
          await handleTransferEvent(
            event.args.from,
            event.args.to,
            event.args.value,
            event
          );
        }
      }
    }

    console.log("✅ Recent transfer scan completed\n");
  } catch (error) {
    console.error("❌ Error scanning recent transfers:", error);
  }
}

/**
 * Stop the blockchain listener
 */
export function stopBlockchainListener(): void {
  if (!isListening) {
    return;
  }

  isListening = false;
  console.log("🛑 Blockchain listener stopped");
}
