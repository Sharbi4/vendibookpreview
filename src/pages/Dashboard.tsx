import { useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { usePageTracking } from '@/hooks/usePageTracking';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import HostDashboard from '@/components/dashboard/HostDashboard';
import ShopperDashboard from '@/components/dashboard/ShopperDashboard';
import { 
  Loader2, 
  Store,
  LayoutGrid,
  AlertTriangle
} from 'lucide-react';

const Dashboard = () => {
  const { user, isLoading, isVerified, hasRole } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  usePageTracking();

  // URL-based mode detection - default to shopper
  const currentMode = searchParams.get('view') === 'host' ? 'host' : 'shopper';
  const isHost = hasRole('host');

  const toggleMode = (checked: boolean) => {
    setSearchParams({ view: checked ? 'host' : 'shopper' });
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
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-1">
        {/* Sticky Context Bar - Professional Command Center Style */}
        <div className="sticky top-16 z-30 bg-background/95 backdrop-blur-sm border-b border-border">
          <div className="container max-w-5xl py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  {currentMode === 'host' ? (
                    <Store className="h-5 w-5 text-primary" />
                  ) : (
                    <LayoutGrid className="h-5 w-5 text-primary" />
                  )}
                  <h1 className="text-lg font-semibold text-foreground">
                    {currentMode === 'host' ? 'Vendor Console' : 'My Activity'}
                  </h1>
                </div>
                <span className="text-sm text-muted-foreground hidden sm:inline">
                  • {user.email}
                </span>
              </div>

              {/* Context Toggle - Only for Hosts */}
              {isHost && (
                <div className="flex items-center gap-2">
                  <Label 
                    htmlFor="mode-switch" 
                    className={`text-sm cursor-pointer transition-colors ${
                      currentMode === 'shopper' ? 'text-foreground font-medium' : 'text-muted-foreground'
                    }`}
                  >
                    Buying
                  </Label>
                  <Switch 
                    id="mode-switch"
                    checked={currentMode === 'host'} 
                    onCheckedChange={toggleMode}
                  />
                  <Label 
                    htmlFor="mode-switch" 
                    className={`text-sm cursor-pointer transition-colors ${
                      currentMode === 'host' ? 'text-foreground font-medium' : 'text-muted-foreground'
                    }`}
                  >
                    Hosting
                  </Label>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Verification Alert - Only shown if not verified */}
        {!isVerified && (
          <div className="bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-900">
            <div className="container max-w-5xl py-3">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                <span className="text-sm text-amber-800 dark:text-amber-200">
                  Complete identity verification to unlock all features
                </span>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="ml-auto h-7 text-xs"
                  asChild
                >
                  <Link to="/verify-identity">Verify Now</Link>
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <section className="py-6 md:py-8 bg-background">
          <div className="container max-w-5xl">
            {currentMode === 'host' ? <HostDashboard /> : <ShopperDashboard />}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Dashboard;
