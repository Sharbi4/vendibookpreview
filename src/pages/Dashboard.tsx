import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import HostDashboard from '@/components/dashboard/HostDashboard';
import ShopperDashboard from '@/components/dashboard/ShopperDashboard';
import VerificationProgress from '@/components/verification/VerificationProgress';
import { 
  Loader2, 
  Settings,
  User,
  Bell,
  Shield,
  ShieldCheck,
  Home,
  ShoppingBag
} from 'lucide-react';

const Dashboard = () => {
  const { user, profile, roles, isLoading, isVerified, hasRole } = useAuth();
  const navigate = useNavigate();

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

  const isHost = hasRole('host');
  const isShopper = hasRole('shopper');

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-1 container py-6 md:py-8 max-w-5xl">
        {/* Welcome Card */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-foreground">
              {profile?.full_name ? `Welcome back, ${profile.full_name.split(' ')[0]} 👋` : 'Dashboard'}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Manage listings, requests, and payouts in one place.
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild className="h-8 text-xs">
              <Link to="/account">
                <User className="h-3.5 w-3.5 mr-1.5" />
                My Account
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild className="h-8 text-xs">
              <Link to="/notification-preferences">
                <Bell className="h-3.5 w-3.5 mr-1.5" />
                Notifications
              </Link>
            </Button>
          </div>
        </div>

        {/* Verification Progress - Compact Checklist */}
        <div className="mb-6">
          <VerificationProgress />
        </div>

        {/* Dashboard Content - Tabs for dual-role users */}
        {isHost && isShopper ? (
          <Tabs defaultValue="host" className="w-full">
            <TabsList className="grid w-full max-w-xs grid-cols-2 mb-6 bg-muted/50 p-1 rounded-lg h-9 mx-auto">
              <TabsTrigger value="host" className="gap-1.5 rounded-md text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <Home className="h-3.5 w-3.5" />
                As Host
              </TabsTrigger>
              <TabsTrigger value="renter" className="gap-1.5 rounded-md text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <ShoppingBag className="h-3.5 w-3.5" />
                As Renter
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="host" className="mt-0">
              <HostDashboard />
            </TabsContent>
            
            <TabsContent value="renter" className="mt-0">
              <ShopperDashboard />
            </TabsContent>
          </Tabs>
        ) : (
          <>
            {isHost && <HostDashboard />}
            {!isHost && <ShopperDashboard />}
          </>
        )}

        {/* Compact Account Info */}
        <div className="mt-6 p-4 rounded-xl bg-card border border-border">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
              <Settings className="h-4 w-4 text-muted-foreground" />
              Account
            </h3>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="text-sm">
              <span className="text-xs text-muted-foreground block mb-0.5">Email</span>
              <p className="font-medium text-foreground truncate">{user.email}</p>
            </div>
            <div className="text-sm">
              <span className="text-xs text-muted-foreground block mb-0.5">Role</span>
              <div className="flex gap-1.5 flex-wrap">
                {roles.map((role) => (
                  <span 
                    key={role}
                    className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full capitalize font-medium"
                  >
                    {role}
                  </span>
                ))}
              </div>
            </div>
            <div className="text-sm">
              <span className="text-xs text-muted-foreground block mb-0.5">Verification</span>
              <p className={`flex items-center gap-1.5 font-medium text-xs ${isVerified ? 'text-emerald-600' : 'text-amber-600'}`}>
                {isVerified ? <ShieldCheck className="h-3.5 w-3.5" /> : <Shield className="h-3.5 w-3.5" />}
                {isVerified ? 'Verified' : 'Pending'}
              </p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Dashboard;
