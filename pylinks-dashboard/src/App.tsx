import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import PayPage from "./pages/PayPage"; // Payment UI page

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        {/* ✅ Handles /pay and all query params */}
        <Route path="/pay" element={<PayPage />} />
      </Routes>
    </Router>
  );
}

export default App;