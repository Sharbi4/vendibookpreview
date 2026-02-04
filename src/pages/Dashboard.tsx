import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { usePageTracking } from '@/hooks/usePageTracking';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import HostDashboard from '@/components/dashboard/HostDashboard';
import ShopperDashboard from '@/components/dashboard/ShopperDashboard';
import DashboardOnboarding from '@/components/onboarding/DashboardOnboarding';
import { Loader2 } from 'lucide-react';

const Dashboard = () => {
  const { user, isLoading, hasRole } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showOnboarding, setShowOnboarding] = useState(false);

  usePageTracking();

  // URL-based mode detection - default to shopper
  const currentMode = searchParams.get('view') === 'host' ? 'host' : 'shopper';
  const isHost = hasRole('host');

  const handleModeChange = (newMode: 'host' | 'shopper') => {
    setSearchParams({ view: newMode });
  };

  // Check for onboarding on mount
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
      {currentMode === 'host' ? <HostDashboard /> : <ShopperDashboard />}

      {/* Dashboard Onboarding Tour */}
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
