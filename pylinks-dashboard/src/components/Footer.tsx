export default function Footer() {
    return (
      <footer className="bg-white border-t border-gray-100 mt-16">
        <div className="max-w-7xl mx-auto px-6 py-10 grid md:grid-cols-3 gap-10 text-sm text-gray-600">
          <div>
            <p className="font-semibold text-gray-800 mb-2">Merchant Dashboard</p>
            <p>
              Empowering merchants with tools to manage payments and grow their business.
            </p>
          </div>
  
          <div>
            <p className="font-semibold text-gray-800 mb-2">Quick Links</p>
            <ul className="space-y-1">
              <li><a href="/" className="hover:text-black">Register</a></li>
              <li><a href="/dashboard" className="hover:text-black">Dashboard</a></li>
              <li><a href="/support" className="hover:text-black">Support</a></li>
              <li><a href="#" className="hover:text-black">Privacy Policy</a></li>
            </ul>
          </div>
  
          <div>
            <p className="font-semibold text-gray-800 mb-2">Connect</p>
            <ul className="space-y-1">
              <li><a href="#" className="hover:text-black">Twitter</a></li>
              <li><a href="#" className="hover:text-black">LinkedIn</a></li>
              <li><a href="#" className="hover:text-black">GitHub</a></li>
            </ul>
          </div>
        </div>
  
        <div className="border-t border-gray-100 py-4 text-center text-xs text-gray-500">
          © 2025 Merchant Dashboard. Built for merchants, by merchants.
        </div>
      </footer>
    );
  }  