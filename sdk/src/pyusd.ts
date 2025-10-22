import { ethers } from "ethers";
import PYUSD_ABI from "./PYUSD.abi.json";

const PYUSD_CONTRACT = "0xCaC524BcA292aaade2DF8A05cC58F0a65B1B3bB9";
// 0xCaC524BcA292aaade2DF8A05cC58F0a65B1B3bB9 - Sepolia address
// 0x6c3ea9036406852006290770bedfcaba0e23a0e8 - Mainnet address
export async function verifyPayment({
  sessionId,
  recipient,
  amount,
}: {
  sessionId: string;
  recipient: string;
  amount: number;
}) {
  const provider = new ethers.providers.JsonRpcProvider(
    process.env.ETH_RPC_SEPOLIA
  );
  const contract = new ethers.Contract(PYUSD_CONTRACT, PYUSD_ABI, provider);

  const filter = contract.filters.Transfer(null, recipient);
  const currentBlock = await provider.getBlockNumber();
  const events = await contract.queryFilter(
    filter,
    currentBlock - 2000,
    currentBlock
  );

  for (const event of events) {
    if (
      event.args &&
      event.args.value.toString() ===
        ethers.utils.parseUnits(amount.toString(), 6).toString()
    ) {
      return { status: "paid", txHash: event.transactionHash };
    }
  }
  return { status: "pending" };
}
