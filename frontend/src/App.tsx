import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "@/pages/Home";
import TradingDashboard from "@/pages/TradingDashboard";
import DualAccountDashboard from "@/pages/DualAccountDashboard";
import AutomatedTradingPage from "@/pages/AutomatedTradingPage";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/dashboard" element={<TradingDashboard />} />
        <Route path="/dual-dashboard" element={<DualAccountDashboard />} />
        <Route path="/automated-trading" element={<AutomatedTradingPage />} />
        <Route path="/other" element={<div className="text-center text-xl">Other Page - Coming Soon</div>} />
      </Routes>
    </Router>
  );
}
