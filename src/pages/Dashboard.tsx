import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import HostDashboard from '@/components/dashboard/HostDashboard';
import { 
  Loader2, 
  Shield, 
  ShieldCheck, 
  Calendar, 
  MessageSquare,
  Settings,
  Store
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
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
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
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">
            Welcome back{profile?.full_name ? `, ${profile.full_name}` : ''}!
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your {isHost ? 'listings and bookings' : 'bookings and inquiries'}
          </p>
        </div>

        {/* Verification Banner */}
        {!isVerified && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-8">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <Shield className="h-6 w-6 text-amber-600" />
                <div>
                  <p className="font-medium text-amber-800">Complete Identity Verification</p>
                  <p className="text-sm text-amber-700">
                    Verify your identity to unlock all features and build trust with other users.
                  </p>
                </div>
              </div>
              <Button 
                onClick={() => navigate('/verify-identity')}
                variant="outline"
                className="border-amber-300 text-amber-800 hover:bg-amber-100"
              >
                Verify Now
              </Button>
            </div>
          </div>
        )}

        {/* Verified Badge */}
        {isVerified && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-8">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-6 w-6 text-emerald-600" />
              <div>
                <p className="font-medium text-emerald-800">Identity Verified</p>
                <p className="text-sm text-emerald-700">
                  Your identity has been verified. You have full access to all features.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Host Dashboard */}
        {isHost && <HostDashboard />}

        {/* Shopper Quick Actions */}
        {isShopper && !isHost && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <Link 
              to="/"
              className="bg-card border border-border rounded-xl p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Store className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Browse Listings</h3>
                  <p className="text-sm text-muted-foreground">Find your next asset</p>
                </div>
              </div>
            </Link>

            <Link 
              to="/dashboard/my-bookings"
              className="bg-card border border-border rounded-xl p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Calendar className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">My Bookings</h3>
                  <p className="text-sm text-muted-foreground">Track your rentals</p>
                </div>
              </div>
            </Link>

            <Link 
              to="/dashboard/inquiries"
              className="bg-card border border-border rounded-xl p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <MessageSquare className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">My Inquiries</h3>
                  <p className="text-sm text-muted-foreground">View sale inquiries</p>
                </div>
              </div>
            </Link>

            <Link 
              to="/dashboard/settings"
              className="bg-card border border-border rounded-xl p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                  <Settings className="h-6 w-6 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Settings</h3>
                  <p className="text-sm text-muted-foreground">Account preferences</p>
                </div>
              </div>
            </Link>
          </div>
        )}

        {/* Account Info */}
        <div className="bg-muted/50 rounded-xl p-6 mt-8">
          <h3 className="font-semibold text-foreground mb-3">Your Account</h3>
          <div className="grid gap-3">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Email</span>
              <span className="text-foreground">{user.email}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Role</span>
              <div className="flex gap-2">
                {roles.map((role) => (
                  <span 
                    key={role}
                    className="px-3 py-1 bg-primary/10 text-primary text-sm rounded-full capitalize"
                  >
                    {role}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Verification</span>
              <span className={`flex items-center gap-1 ${isVerified ? 'text-emerald-600' : 'text-amber-600'}`}>
                {isVerified ? <ShieldCheck className="h-4 w-4" /> : <Shield className="h-4 w-4" />}
                {isVerified ? 'Verified' : 'Pending'}
              </span>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Dashboard;
