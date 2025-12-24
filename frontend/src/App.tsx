import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { lazy, Suspense } from 'react'
import { Toaster } from 'sonner';
import { DashboardProvider } from '@/contexts/DashboardContext';
import ResponsiveLayout from '@/components/layout/ResponsiveLayout'

const Home = lazy(() => import('@/pages/Home'))
const DualAccountDashboard = lazy(() => import('@/pages/DualAccountDashboard'))
const AutomatedTradingPage = lazy(() => import('@/pages/AutomatedTradingPage'))
const Menu = lazy(() => import('@/pages/Menu'))
const DesktopDashboardPage = lazy(() => import('@/pages/DesktopDashboardPage'))
const SMCDashboardPage = lazy(() => import('@/pages/SMCDashboardPage'))
const AssetsPage = lazy(() => import('@/pages/AssetsPage'))
const UnifiedDashboardPage = lazy(() => import('@/pages/UnifiedDashboardPage'))
const DesignTokensPage = lazy(() => import('@/pages/design-system/DesignTokensPage'))
const ComponentGalleryPage = lazy(() => import('@/pages/design-system/ComponentGalleryPage'))
 

export default function App() {
  return (
    <Router>
      <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
        <Toaster position="top-right" richColors />
        <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Carregando...</div>}>
          <Routes>
            {/* New Unified Dashboard - Main Route */}
            <Route path="/" element={<UnifiedDashboardPage />} />
            <Route path="/unified" element={<UnifiedDashboardPage />} />

            {/* Legacy Routes Redirects or Replacements */}
            <Route path="/pro" element={<UnifiedDashboardPage />} />
            <Route path="/smc" element={<UnifiedDashboardPage />} />
            <Route path="/auto" element={<UnifiedDashboardPage />} />
            <Route path="/automated-trading" element={<UnifiedDashboardPage />} />
            <Route path="/dual-dashboard" element={<UnifiedDashboardPage />} />

            {/* Existing Routes - Wrapped in ResponsiveLayout */}
            <Route path="*" element={
              <DashboardProvider>
                <ResponsiveLayout>
                  <Routes>
                    <Route path="/home" element={<Home />} />
                    <Route path="/assets" element={<AssetsPage />} />
                    <Route path="/menu" element={<Menu />} />
                    
                    {/* Design System Documentation */}
                    <Route path="/design-system/tokens" element={<DesignTokensPage />} />
                    <Route path="/design-system/components" element={<ComponentGalleryPage />} />

                    <Route path="/other" element={<div className="text-center text-xl">Other Page - Coming Soon</div>} />
                  </Routes>
                </ResponsiveLayout>
              </DashboardProvider>
            } />
          </Routes>
        </Suspense>
      </div>
    </Router>
  );
}
