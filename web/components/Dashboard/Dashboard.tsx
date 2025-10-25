import { useEffect, useState } from "react";
import axios from "axios";
import { logout } from "../firebase";
import { useNavigate } from "react-router-dom";
import QRCode from "react-qr-code";

export default function Dashboard() {
  const [merchant, setMerchant] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const storedMerchant = localStorage.getItem("merchant");
    if (storedMerchant) {
      setMerchant(JSON.parse(storedMerchant));
    }
  }, []);

  // 1️⃣ Connect MetaMask and update wallet on backend
  const connectWallet = async () => {
    if (!window.ethereum) {
      alert("Please install MetaMask first.");
      return;
    }

    try {
      setConnecting(true);
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
      const address = accounts[0];
      setWalletAddress(address);
      setWalletConnected(true);

      if (!merchant?.apiKey) {
        alert("Merchant API key missing.");
        return;
      }

      // Update wallet address on backend
      const res = await axios.put(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/merchants/update-wallet`,
        { walletAddress: address },
        {
          headers: {
            "x-api-key": merchant.apiKey,
            "Content-Type": "application/json",
          },
        }
      );

      if (res.data?.success) {
        alert("✅ Wallet updated successfully!");
        const updated = { ...merchant, walletAddress: address };
        localStorage.setItem("merchant", JSON.stringify(updated));
        setMerchant(updated);
      } else {
        alert("⚠️ Failed to update wallet. Please try again.");
      }
    } catch (err: any) {
      console.error(err);
      alert(
        `Failed to connect wallet: ${err.response?.data?.error || err.message}`
      );
    } finally {
      setConnecting(false);
    }
  };

  // 2️⃣ Regenerate API Key
  const regenerateKey = async () => {
    if (!merchant) return;
    try {
      setLoading(true);
      const res = await axios.post(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/merchants/regenerate-keys`,
        {},
        { headers: { "x-api-key": merchant.apiKey || "" } }
      );
      const updated = { ...merchant, ...res.data.data };
      setMerchant(updated);
      localStorage.setItem("merchant", JSON.stringify(updated));
    } catch {
      alert("Failed to regenerate key");
    } finally {
      setLoading(false);
    }
  };

  // 3️⃣ Generate QR for payments
  const generatePaymentQR = () => {
    if (!amount || isNaN(Number(amount))) {
      alert("Please enter a valid amount");
      return;
    }

    const merchantId = merchant?.merchantId || merchant?._id;
    const payUrl = `${
      process.env.VITE_FRONTEND_URL || "http://localhost:5173"
    }/pay?merchantId=${merchantId}&amount=${amount}&memo=${encodeURIComponent(
      memo || ""
    )}`;
    setQrUrl(payUrl);
  };

  if (!merchant)
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-50">
        <p>No merchant session found.</p>
        <button
          onClick={() => navigate("/")}
          className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md shadow hover:bg-indigo-700 transition"
        >
          Go Back
        </button>
      </div>
    );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-12 px-4">
      <div className="w-full max-w-3xl bg-white rounded-2xl shadow-lg p-8 transition-all">
        <h1 className="text-3xl font-semibold text-gray-900 mb-6 text-center">
          Merchant Dashboard
        </h1>

        {/* Merchant Info */}
        <div className="space-y-3 mb-8 text-gray-700">
          <p>
            <span className="font-medium text-gray-900">Name:</span>{" "}
            {merchant.name}
          </p>
          <p>
            <span className="font-medium text-gray-900">Email:</span>{" "}
            {merchant.email}
          </p>
          <p>
            <span className="font-medium text-gray-900">Wallet:</span>{" "}
            {merchant.walletAddress ? (
              <span className="text-green-600 font-mono">
                {merchant.walletAddress.slice(0, 6)}...
                {merchant.walletAddress.slice(-4)}
              </span>
            ) : (
              <span className="text-red-600">Not linked</span>
            )}
          </p>
          <p>
            <span className="font-medium text-gray-900">API Key:</span>
            <span className="block font-mono text-sm text-blue-700 bg-gray-50 p-2 rounded mt-1 break-all">
              {merchant.apiKey || "—"}
            </span>
          </p>
        </div>

        {/* Wallet Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          <button
            onClick={connectWallet}
            disabled={connecting}
            className={`flex-1 px-5 py-3 rounded-lg text-white font-medium transition-all ${
              walletConnected
                ? "bg-green-600"
                : "bg-indigo-600 hover:bg-indigo-700"
            }`}
          >
            {connecting
              ? "Connecting..."
              : walletConnected
              ? "Wallet Connected ✅"
              : "Connect Wallet"}
          </button>

          <button
            onClick={regenerateKey}
            disabled={loading}
            className="flex-1 px-5 py-3 rounded-lg bg-yellow-500 hover:bg-yellow-600 text-white font-medium transition-all"
          >
            {loading ? "Regenerating..." : "Regenerate API Key"}
          </button>

          <button
            onClick={() => {
              logout();
              localStorage.clear();
              navigate("/");
            }}
            className="flex-1 px-5 py-3 rounded-lg bg-gray-700 hover:bg-gray-800 text-white font-medium transition-all"
          >
            Logout
          </button>
        </div>

        <hr className="my-6 border-gray-200" />

        {/* QR Generator */}
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-4 text-gray-900">
            Generate Payment QR
          </h2>

          <div className="space-y-3 mb-4">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter Amount (e.g. 25.00)"
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none transition"
            />

            <input
              type="text"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="Payment memo (optional)"
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none transition"
            />

            <button
              onClick={generatePaymentQR}
              className="w-full bg-indigo-600 text-white font-medium py-3 rounded-lg hover:bg-indigo-700 transition"
            >
              Generate QR
            </button>
          </div>

          {qrUrl && (
            <div className="mt-6 flex flex-col items-center">
              <QRCode value={qrUrl} size={160} />
              <p className="mt-2 text-gray-600 text-sm break-all">{qrUrl}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
