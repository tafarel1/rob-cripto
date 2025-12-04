import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "@/pages/Home";
import DualAccountDashboard from "@/pages/DualAccountDashboard";
import AutomatedTradingPage from "@/pages/AutomatedTradingPage";
 

export default function App() {
  return (
    <Router>
      <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/dual-dashboard" element={<DualAccountDashboard />} />
          <Route path="/automated-trading" element={<AutomatedTradingPage />} />
          <Route path="/other" element={<div className="text-center text-xl">Other Page - Coming Soon</div>} />
        </Routes>
      </div>
    </Router>
  );
}
