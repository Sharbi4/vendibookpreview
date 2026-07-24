import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { usePageTracking } from '@/hooks/usePageTracking';
import { useDashboardPersona } from '@/hooks/useDashboardPersona';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import HostDashboard from '@/components/dashboard/HostDashboard';
import ShopperDashboard from '@/components/dashboard/ShopperDashboard';
import DashboardOnboarding from '@/components/onboarding/DashboardOnboarding';
import EmailVerificationBanner from '@/components/auth/EmailVerificationBanner';
import PurchaseReturnBanner from '@/components/monetization/PurchaseReturnBanner';

import { Loader2 } from 'lucide-react';

const DASHBOARD_MODE_KEY = 'vendibook_dashboard_mode';

const Dashboard = () => {
  const { user, isLoading, hasRole } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showOnboarding, setShowOnboarding] = useState(false);

  usePageTracking();

  // Auto-detect persona from listing activity (Pro vs Shopper)
  const { persona, isLoading: personaLoading, override, setOverride } = useDashboardPersona();
  const autoMode: 'host' | 'shopper' = persona === 'shopper' ? 'shopper' : 'host';

  // Resolution priority: explicit URL ?view= > saved override > auto-detected persona
  const urlView = searchParams.get('view');
  const savedMode = localStorage.getItem(DASHBOARD_MODE_KEY) as 'host' | 'shopper' | null;
  const currentMode: 'host' | 'shopper' =
    urlView === 'host' || urlView === 'shopper'
      ? (urlView as 'host' | 'shopper')
      : (savedMode || autoMode);

  const isHost = hasRole('host') || persona !== 'shopper';

  // Sync URL with resolved mode (deep-linkable, persists across reloads)
  useEffect(() => {
    if (!urlView && !personaLoading) {
      const tab = searchParams.get('tab');
      const next = new URLSearchParams();
      next.set('view', currentMode);
      if (tab) next.set('tab', tab);
      setSearchParams(next, { replace: true });
    }
  }, [urlView, personaLoading, currentMode, searchParams, setSearchParams]);

  const handleModeChange = (newMode: 'host' | 'shopper') => {
    localStorage.setItem(DASHBOARD_MODE_KEY, newMode);
    // Persist as a persona override so the auto-detect logic respects user choice
    setOverride(newMode === 'host' ? (persona === 'shopper' ? 'pro' : persona) : 'shopper');
    const next = new URLSearchParams(searchParams);
    next.set('view', newMode);
    setSearchParams(next);
  };

  // Onboarding tour
  useEffect(() => {
    const hasSeen = localStorage.getItem('vendibook_dashboard_onboarding_v1');
    if (!hasSeen && !isLoading && user) {
      const timer = setTimeout(() => setShowOnboarding(true), 1000);
      return () => clearTimeout(timer);
    }
  }, [isLoading, user]);

  const handleOnboardingComplete = () => {
    localStorage.setItem('vendibook_dashboard_onboarding_v1', 'true');
    setShowOnboarding(false);
  };

  useEffect(() => {
    if (!isLoading && !user) {
      navigate('/auth');
    }
  }, [user, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }


  if (!user) return null;

  return (
    <DashboardLayout
      mode={currentMode}
      onModeChange={handleModeChange}
      isHost={isHost}
    >
      <EmailVerificationBanner />
      {currentMode === 'host' ? <HostDashboard /> : <ShopperDashboard />}

      {showOnboarding && (
        <DashboardOnboarding
          mode={currentMode}
          onComplete={handleOnboardingComplete}
        />
      )}
    </DashboardLayout>
  );
};

export default Dashboard;
