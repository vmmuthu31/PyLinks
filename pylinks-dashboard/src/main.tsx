import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./index.css";
import "./styles/globals.css";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import PayPage from "./pages/PayPage"; // 👈 add this import

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/pay" element={<PayPage />} /> {/* 👈 add this route */}
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);