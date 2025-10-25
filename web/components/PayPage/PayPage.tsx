import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ethers } from "ethers";
import axios from "axios";
import erc20ABI from "../../abi/erc20ABI.json";

const PYUSD_ADDRESS = "0xCaC524BcA292aaade2DF8A05cC58F0a65B1B3bB9"; // TODO: replace with actual Sepolia PYUSD contract address

export default function PayPage() {
  const [searchParams] = useSearchParams();
  const [merchant, setMerchant] = useState<any>(null);
  const [account, setAccount] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);

  const merchantId = searchParams.get("merchantId");
  const amount = searchParams.get("amount");
  const memo = searchParams.get("memo");

  // 🟦 Step 1: Fetch merchant details (uses public GET /api/merchants/:id)
  useEffect(() => {
    if (!merchantId) return;
    const fetchMerchant = async () => {
      try {
        const res = await axios.get(
          `${process.env.VITE_BACKEND_URL}/api/merchants/${merchantId}`
        );
        setMerchant(res.data.data);
      } catch (err) {
        console.error("Error fetching merchant:", err);
        alert("Invalid or missing merchant details.");
      }
    };
    fetchMerchant();
  }, [merchantId]);

  // 🟩 Step 2: Connect user's MetaMask wallet
  const connectWallet = async () => {
    if (!window.ethereum) {
      alert("Please install MetaMask.");
      return;
    }
    try {
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
      setAccount(accounts[0]);
      setConnected(true);
    } catch (err) {
      console.error(err);
      alert("Failed to connect MetaMask.");
    }
  };

  // 🟧 Step 3: Send payment to merchant wallet
  const handlePayment = async () => {
    if (!merchant?.walletAddress)
      return alert("Merchant wallet address not found.");
    if (!amount || Number(amount) <= 0)
      return alert("Please enter a valid amount.");
    if (!window.ethereum)
      return alert("MetaMask not detected. Please install it first.");

    try {
      setLoading(true);
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(PYUSD_ADDRESS, erc20ABI, signer);

      // Convert amount to 18 decimals (check PYUSD decimals if different)
      const parsedAmount = ethers.utils.parseUnits(amount.toString(), 6);

      console.log("Merchant Wallet:", merchant.walletAddress);
      console.log("Amount:", parsedAmount);
      console.log("Sender:", account);

      const tx = await contract.transfer(merchant.walletAddress, parsedAmount, {
        gasLimit: 100000,
      });
      await tx.wait();

      setTxHash(tx.hash);
      alert("✅ Payment successful!");

      // Record payment to backend (optional)
      await axios.post(
        `${process.env.VITE_BACKEND_URL}/api/payments/record`,
        {
          merchantId,
          txHash: tx.hash,
          amount,
          userWallet: account,
          memo,
        },
        {
          headers: {
            "x-api-key": merchant?.apiKey || localStorage.getItem("apiKey"),
          },
        }
      );
    } catch (err: any) {
      console.error("Payment failed:", err);
      alert(`Payment failed: ${err.message || "Unknown error"}`);
    } finally {
      setLoading(false);
    }
  };

  // 🟪 Step 4: Render UI
  if (!merchant)
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <p>Loading merchant information...</p>
      </div>
    );

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-6">
      <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-md text-center">
        <h1 className="text-2xl font-semibold mb-4">
          Pay {merchant.name || "Merchant"}
        </h1>
        <p className="text-gray-700 mb-2">
          Amount: <b>{amount} PYUSD</b>
        </p>
        {memo && (
          <p className="text-gray-500 mb-4">
            Memo: <i>{memo}</i>
          </p>
        )}

        {!connected ? (
          <button
            onClick={connectWallet}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 w-full"
          >
            Connect Wallet
          </button>
        ) : (
          <>
            <p className="text-sm text-gray-500 mb-3">
              Connected: {account?.slice(0, 6)}...{account?.slice(-4)}
            </p>
            <button
              onClick={handlePayment}
              disabled={loading}
              className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 w-full"
            >
              {loading ? "Processing..." : `Pay ${amount} PYUSD`}
            </button>
          </>
        )}

        {txHash && (
          <div className="mt-6 text-left">
            <p className="text-sm text-gray-700">✅ Payment Successful!</p>
            <p className="text-xs text-blue-600 break-all">TX Hash: {txHash}</p>
            <a
              href={`https://sepolia.etherscan.io/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 underline text-xs"
            >
              View on Etherscan
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
