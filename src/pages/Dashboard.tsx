import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import HostDashboard from '@/components/dashboard/HostDashboard';
import ShopperDashboard from '@/components/dashboard/ShopperDashboard';
import { 
  Loader2, 
  Shield, 
  ShieldCheck,
  Settings,
  User,
  Bell
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
      
      <main className="flex-1 container py-8">
        {/* Enhanced Welcome Section */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-background via-background to-primary/5 border border-border/50 p-6 mb-8">
          <div className="absolute inset-0 bg-grid-pattern opacity-[0.03]" />
          <div className="absolute -top-32 -right-32 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
          
          <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-1">
                Welcome back{profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''}! 👋
              </h1>
              <p className="text-muted-foreground">
                {isHost 
                  ? 'Manage your listings, bookings, and track your performance.'
                  : 'Track your bookings and discover new opportunities.'
                }
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" asChild className="hover:scale-105 transition-transform">
                <Link to="/profile/edit">
                  <User className="h-4 w-4 mr-1.5" />
                  Profile
                </Link>
              </Button>
              <Button variant="outline" size="sm" asChild className="hover:scale-105 transition-transform">
                <Link to="/notification-preferences">
                  <Bell className="h-4 w-4 mr-1.5" />
                  Notifications
                </Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Verification Banner */}
        {!isVerified && (
          <div className="relative overflow-hidden bg-gradient-to-r from-amber-50 to-amber-50/50 border border-amber-200 rounded-xl p-5 mb-8 group hover:shadow-md transition-all">
            <div className="absolute inset-0 bg-grid-pattern opacity-5" />
            <div className="relative flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
                  <Shield className="h-6 w-6 text-amber-600" />
                </div>
                <div>
                  <p className="font-semibold text-amber-800">Complete Identity Verification</p>
                  <p className="text-sm text-amber-700">
                    Verify your identity to unlock all features and build trust with other users.
                  </p>
                </div>
              </div>
              <Button 
                onClick={() => navigate('/verify-identity')}
                className="bg-amber-600 hover:bg-amber-700 text-white shadow-lg shadow-amber-500/25"
              >
                Verify Now
              </Button>
            </div>
          </div>
        )}

        {/* Verified Badge */}
        {isVerified && (
          <div className="relative overflow-hidden bg-gradient-to-r from-emerald-50 to-emerald-50/50 border border-emerald-200 rounded-xl p-5 mb-8">
            <div className="absolute inset-0 bg-grid-pattern opacity-5" />
            <div className="relative flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
                <ShieldCheck className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <p className="font-semibold text-emerald-800">Identity Verified ✓</p>
                <p className="text-sm text-emerald-700">
                  Your identity has been verified. You have full access to all features.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Host Dashboard */}
        {isHost && <HostDashboard />}

        {/* Shopper Dashboard - show for shoppers OR users with no roles */}
        {(!isHost || isShopper) && <ShopperDashboard />}

        {/* Enhanced Account Info */}
        <div className="relative overflow-hidden bg-gradient-to-br from-muted/50 to-muted/30 rounded-xl p-6 mt-8 border border-border/50">
          <div className="absolute inset-0 bg-grid-pattern opacity-[0.03]" />
          <div className="relative">
            <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <Settings className="h-5 w-5 text-muted-foreground" />
              Your Account
            </h3>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="p-4 rounded-lg bg-background/50 border border-border/50">
                <span className="text-sm text-muted-foreground">Email</span>
                <p className="font-medium text-foreground mt-1 truncate">{user.email}</p>
              </div>
              <div className="p-4 rounded-lg bg-background/50 border border-border/50">
                <span className="text-sm text-muted-foreground">Role</span>
                <div className="flex gap-2 mt-1 flex-wrap">
                  {roles.map((role) => (
                    <span 
                      key={role}
                      className="px-3 py-1 bg-primary/10 text-primary text-sm rounded-full capitalize font-medium"
                    >
                      {role}
                    </span>
                  ))}
                </div>
              </div>
              <div className="p-4 rounded-lg bg-background/50 border border-border/50">
                <span className="text-sm text-muted-foreground">Verification</span>
                <p className={`flex items-center gap-2 mt-1 font-medium ${isVerified ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {isVerified ? <ShieldCheck className="h-4 w-4" /> : <Shield className="h-4 w-4" />}
                  {isVerified ? 'Verified' : 'Pending'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Dashboard;
