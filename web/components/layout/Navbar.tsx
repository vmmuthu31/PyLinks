import { Link } from "react-router-dom";

export default function Navbar() {
  return (
    <nav className="w-full bg-white shadow-sm border-b border-gray-100 fixed top-0 left-0 z-50">
      <div className="max-w-7xl mx-auto flex justify-between items-center px-6 py-3">
        <div className="flex items-center space-x-2">
          <span className="text-xl font-semibold">💳 Merchant Portal</span>
        </div>

        <div className="flex items-center space-x-6 text-sm font-medium">
          <Link to="/dashboard" className="hover:text-black text-gray-600">Dashboard</Link>
          <Link to="/profile" className="hover:text-black text-gray-600">Profile</Link>
          <Link to="/qr" className="hover:text-black text-gray-600">QR Code</Link>
          <Link to="/support" className="hover:text-black text-gray-600">Support</Link>
          <Link
            to="/"
            className="bg-black text-white px-4 py-2 rounded-full hover:bg-gray-900 transition"
          >
            Register
          </Link>
        </div>
      </div>
    </nav>
  );
}