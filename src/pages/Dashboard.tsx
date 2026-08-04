import { useEffect, useState, lazy, Suspense } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { usePageTracking } from '@/hooks/usePageTracking';
import { useDashboardPersona } from '@/hooks/useDashboardPersona';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import HostDashboard from '@/components/dashboard/HostDashboard';
import ShopperDashboard from '@/components/dashboard/ShopperDashboard';

import EmailVerificationBanner from '@/components/auth/EmailVerificationBanner';
import PurchaseReturnBanner from '@/components/monetization/PurchaseReturnBanner';
import { Loader2 } from 'lucide-react';

const BuyerOrdersTab = lazy(() => import('@/components/dashboard/tabs/BuyerOrdersTab'));
const BuyerBookingsTab = lazy(() => import('@/components/dashboard/tabs/BuyerBookingsTab'));
const ReferralTab = lazy(() => import('@/components/dashboard/tabs/ReferralTab'));
const HostSalesTab = lazy(() => import('@/components/dashboard/tabs/HostSalesTab'));
const NotificationsTab = lazy(() => import('@/components/dashboard/tabs/NotificationsTab'));
const PremiumToolsTab = lazy(() => import('@/components/dashboard/tabs/PremiumToolsTab'));
const MembershipTab = lazy(() => import('@/components/dashboard/tabs/MembershipTab'));
const FavoritesTab = lazy(() => import('@/components/dashboard/tabs/FavoritesTab'));
const InsightsReportingTab = lazy(() => import('@/components/dashboard/tabs/InsightsReportingTab'));
const PromoteUpgradesTab = lazy(() => import('@/components/dashboard/tabs/PromoteUpgradesTab'));
const PayoutsPanel = lazy(() => import('@/components/dashboard/tabs/PayoutsPanel'));
const TransactionsDisputesTab = lazy(() => import('@/components/dashboard/tabs/TransactionsDisputesTab'));

const DASHBOARD_MODE_KEY = 'vendibook_dashboard_mode';

const TabFallback = () => (
  <div className="flex items-center justify-center py-20">
    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
  </div>
);

const Dashboard = () => {
  const { user, isLoading, hasRole } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  usePageTracking();

  const { persona, isLoading: personaLoading, setOverride } = useDashboardPersona();
  const autoMode: 'host' | 'shopper' = persona === 'shopper' ? 'shopper' : 'host';

  const urlView = searchParams.get('view');
  const savedMode = typeof window !== 'undefined'
    ? (localStorage.getItem(DASHBOARD_MODE_KEY) as 'host' | 'shopper' | null)
    : null;
  const currentMode: 'host' | 'shopper' =
    urlView === 'host' || urlView === 'shopper'
      ? (urlView as 'host' | 'shopper')
      : (savedMode || autoMode);

  const isHost = hasRole('host') || persona !== 'shopper';
  const tab = searchParams.get('tab');

  useEffect(() => {
    if (!urlView && !personaLoading) {
      const next = new URLSearchParams();
      next.set('view', currentMode);
      if (tab) next.set('tab', tab);
      setSearchParams(next, { replace: true });
    }
  }, [urlView, personaLoading, currentMode, tab, setSearchParams]);

  const handleModeChange = (newMode: 'host' | 'shopper') => {
    localStorage.setItem(DASHBOARD_MODE_KEY, newMode);
    setOverride(newMode === 'host' ? (persona === 'shopper' ? 'pro' : persona) : 'shopper');
    const next = new URLSearchParams();
    next.set('view', newMode);
    setSearchParams(next);
  };


  useEffect(() => {
    if (!isLoading && !user) navigate('/auth');
  }, [user, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading your dashboard…</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const renderTab = () => {
    // Buying-side tabs
    if (currentMode === 'shopper') {
      switch (tab) {
        case 'orders': return <BuyerOrdersTab />;
        case 'transactions': return <TransactionsDisputesTab />;
        case 'bookings': return <BuyerBookingsTab />;
        case 'favorites': return <FavoritesTab />;
        case 'notifications': return <NotificationsTab />;
        case 'referral': return <ReferralTab />;
        case 'tools': return <PremiumToolsTab />;
        case 'membership': return <MembershipTab />;
        case 'permits': return null; // handled inside ShopperDashboard
        default: return <ShopperDashboard />;
      }
    }
    // Hosting-side tabs
    switch (tab) {
      case 'sales': return <HostSalesTab />;
      case 'transactions': return <TransactionsDisputesTab />;
      case 'notifications': return <NotificationsTab />;
      case 'membership': return <MembershipTab />;
      case 'payouts': return <PayoutsPanel />;
      case 'insights': return <InsightsReportingTab />;
      case 'promote': return <PromoteUpgradesTab />;
      default: return <HostDashboard />;
    }
  };

  const content = renderTab();

  return (
    <DashboardLayout mode={currentMode} onModeChange={handleModeChange} isHost={isHost}>
      <EmailVerificationBanner />
      <PurchaseReturnBanner />
      {/* ShopperDashboard already routes permits internally via ?tab=permits */}
      {currentMode === 'shopper' && tab === 'permits' ? (
        <ShopperDashboard />
      ) : content === null ? (
        <ShopperDashboard />
      ) : (
        <Suspense fallback={<TabFallback />}>{content}</Suspense>
      )}

    </DashboardLayout>
  );
};

export default Dashboard;
