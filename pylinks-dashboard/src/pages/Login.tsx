import { googleLogin } from "../firebase";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import axios from "axios";

export default function Login() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [action, setAction] = useState<"register" | "login">("login");

  const handleAuth = async (type: "register" | "login") => {
    setAction(type);
    setLoading(true);

    try {
      // Step 1: Firebase Google login
      const result = await googleLogin();
      const user = result.user;

      // Step 2: Call backend depending on button clicked
      const endpoint =
        type === "register"
          ? `${import.meta.env.VITE_BACKEND_URL}/api/merchants/register`
          : `${import.meta.env.VITE_BACKEND_URL}/api/merchants/login`;

          const payload = {
            email: user.email,
          };
          

      const res = await axios.post(endpoint, payload);

      // Step 3: Save merchant info and redirect
      localStorage.setItem("merchant", JSON.stringify(res.data.data));
      navigate("/dashboard");
    } catch (err: any) {
      console.error("Auth error:", err);

      if (err.response?.status === 409 && action === "register") {
        alert("Merchant already exists. Please use the Login tab instead.");
      } else if (err.response?.status === 404 && action === "login") {
        alert("No account found. Please register first.");
      } else {
        alert(`Authentication failed: ${err.message || "Unexpected error"}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 px-4">
      <div className="bg-white shadow-sm rounded-2xl p-8 w-full max-w-md border border-gray-100">
        <h2 className="text-center text-2xl font-semibold text-gray-800 mb-6">
          Access Your Merchant Account
        </h2>

        {/* Tabs */}
        <div className="flex mb-6 border-b border-gray-200">
          <button
            onClick={() => setAction("login")}
            className={`flex-1 py-2 font-medium text-sm transition-all border-b-2 ${
              action === "login"
                ? "border-black text-black"
                : "border-transparent text-gray-500 hover:text-black"
            }`}
          >
            Login
          </button>
          <button
            onClick={() => setAction("register")}
            className={`flex-1 py-2 font-medium text-sm transition-all border-b-2 ${
              action === "register"
                ? "border-black text-black"
                : "border-transparent text-gray-500 hover:text-black"
            }`}
          >
            Register
          </button>
        </div>

        {/* Google Auth Card */}
        <div className="text-center space-y-4">
          <p className="text-gray-600 text-sm">
            {action === "login"
              ? "Login using your Google account to access your dashboard"
              : "Register your merchant profile using Google authentication"}
          </p>

          <button
            onClick={() => handleAuth(action)}
            disabled={loading}
            className={`w-full flex items-center justify-center space-x-2 px-4 py-3 rounded-lg text-white transition ${
              action === "login"
                ? "bg-blue-600 hover:bg-blue-700"
                : "bg-green-600 hover:bg-green-700"
            } ${loading ? "opacity-75 cursor-not-allowed" : ""}`}
          >
            <img
              src="https://www.svgrepo.com/show/355037/google.svg"
              alt="Google Icon"
              className="h-5 w-5"
            />
            <span>
              {loading
                ? action === "register"
                  ? "Registering..."
                  : "Logging in..."
                : action === "register"
                ? "Register with Google"
                : "Login with Google"}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}