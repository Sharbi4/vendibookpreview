import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Card, CardContent } from '@/components/ui/card';
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
  ShoppingBag,
  Heart,
  Sparkles,
  ArrowRight,
  Mail,
  Calendar
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
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-12 md:py-16 bg-muted/30">
          <div className="container max-w-5xl">
            <div className="text-center mb-8">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
                <Sparkles className="h-4 w-4" />
                Your Dashboard
              </div>
              
              <h1 className="text-3xl md:text-5xl font-bold text-foreground mb-4 tracking-tight">
                {profile?.full_name ? `Welcome back, ${profile.full_name.split(' ')[0]} 👋` : 'Dashboard'}
              </h1>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                Manage listings, requests, and payouts in one place.
              </p>
            </div>

            {/* Quick Action Cards */}
            <div className="grid grid-cols-5 gap-2 sm:gap-3 max-w-3xl mx-auto px-2 sm:px-0">
              <Link to="/transactions?tab=bookings">
                <Card className="border-0 shadow-lg hover:shadow-xl transition-all group cursor-pointer">
                  <CardContent className="p-2 sm:p-4 text-center">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-primary text-white flex items-center justify-center mx-auto mb-1.5 sm:mb-3 group-hover:scale-105 transition-transform shadow-lg">
                      <Calendar className="h-5 w-5 sm:h-6 sm:w-6" />
                    </div>
                    <p className="text-xs sm:text-sm font-medium text-foreground">Bookings</p>
                  </CardContent>
                </Card>
              </Link>
              <Link to="/transactions?tab=purchases">
                <Card className="border-0 shadow-lg hover:shadow-xl transition-all group cursor-pointer">
                  <CardContent className="p-2 sm:p-4 text-center">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-emerald-500 text-white flex items-center justify-center mx-auto mb-1.5 sm:mb-3 group-hover:scale-105 transition-transform shadow-lg">
                      <ShoppingBag className="h-5 w-5 sm:h-6 sm:w-6" />
                    </div>
                    <p className="text-xs sm:text-sm font-medium text-foreground">Purchases</p>
                  </CardContent>
                </Card>
              </Link>
              <Link to="/favorites">
                <Card className="border-0 shadow-lg hover:shadow-xl transition-all group cursor-pointer">
                  <CardContent className="p-2 sm:p-4 text-center">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-pink-500 text-white flex items-center justify-center mx-auto mb-1.5 sm:mb-3 group-hover:scale-105 transition-transform shadow-lg">
                      <Heart className="h-5 w-5 sm:h-6 sm:w-6" />
                    </div>
                    <p className="text-xs sm:text-sm font-medium text-foreground">Favorites</p>
                  </CardContent>
                </Card>
              </Link>
              <Link to="/account">
                <Card className="border-0 shadow-lg hover:shadow-xl transition-all group cursor-pointer">
                  <CardContent className="p-2 sm:p-4 text-center">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-blue-500 text-white flex items-center justify-center mx-auto mb-1.5 sm:mb-3 group-hover:scale-105 transition-transform shadow-lg">
                      <User className="h-5 w-5 sm:h-6 sm:w-6" />
                    </div>
                    <p className="text-xs sm:text-sm font-medium text-foreground">Account</p>
                  </CardContent>
                </Card>
              </Link>
              <Link to="/notification-preferences">
                <Card className="border-0 shadow-lg hover:shadow-xl transition-all group cursor-pointer">
                  <CardContent className="p-2 sm:p-4 text-center">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-amber-500 text-white flex items-center justify-center mx-auto mb-1.5 sm:mb-3 group-hover:scale-105 transition-transform shadow-lg">
                      <Bell className="h-5 w-5 sm:h-6 sm:w-6" />
                    </div>
                    <p className="text-xs sm:text-sm font-medium text-foreground">Notifications</p>
                  </CardContent>
                </Card>
              </Link>
            </div>
          </div>
        </section>

        {/* Main Content */}
        <section className="py-10 md:py-14 bg-background">
          <div className="container max-w-5xl">
            {/* Verification Progress */}
            <div className="mb-8">
              <Card className="border-0 shadow-xl">
                <CardContent className="p-6">
                  <VerificationProgress />
                </CardContent>
              </Card>
            </div>

            {/* Dashboard Content - Tabs for dual-role users */}
            {isHost && isShopper ? (
              <Tabs defaultValue="host" className="w-full">
                {/* Enhanced Tab List */}
                <TabsList className="grid w-full max-w-md grid-cols-2 mb-8 p-1.5 h-auto bg-card border border-border rounded-2xl shadow-sm mx-auto">
                  <TabsTrigger 
                    value="host" 
                    className="flex items-center justify-center gap-2 py-4 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg transition-all duration-200"
                  >
                    <Home className="h-5 w-5" />
                    <span className="font-medium">As Host</span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="renter" 
                    className="flex items-center justify-center gap-2 py-4 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg transition-all duration-200"
                  >
                    <ShoppingBag className="h-5 w-5" />
                    <span className="font-medium">As Renter</span>
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

            {/* Account Info Card */}
            <div className="mt-8">
              <Card className="border-0 shadow-xl">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-14 h-14 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shadow-lg">
                      <Settings className="h-7 w-7" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-foreground">Account Overview</h3>
                      <p className="text-sm text-muted-foreground">Your account details at a glance</p>
                    </div>
                  </div>
                  
                  <div className="grid gap-4 sm:grid-cols-3">
                    {/* Email Card */}
                    <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow group cursor-pointer">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-blue-500 text-white flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                            <Mail className="h-5 w-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-muted-foreground mb-0.5">Email</p>
                            <p className="font-medium text-foreground truncate text-sm">{user.email}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Role Card */}
                    <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow group">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-green-500 text-white flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                            <User className="h-5 w-5" />
                          </div>
                          <div className="flex-1">
                            <p className="text-xs text-muted-foreground mb-1">Role</p>
                            <div className="flex gap-1.5 flex-wrap">
                              {roles.map((role) => (
                                <span 
                                  key={role}
                                  className="px-2 py-0.5 bg-primary text-primary-foreground text-xs rounded-full capitalize font-medium shadow-sm"
                                >
                                  {role}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Verification Card */}
                    <Link to="/identity-verification">
                      <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow group cursor-pointer">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-12 h-12 rounded-xl text-white flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform ${
                              isVerified ? 'bg-primary' : 'bg-amber-500'
                            }`}>
                              {isVerified ? (
                                <ShieldCheck className="h-5 w-5" />
                              ) : (
                                <Shield className="h-5 w-5" />
                              )}
                            </div>
                            <div className="flex-1">
                              <p className="text-xs text-muted-foreground mb-0.5">Verification</p>
                              <p className={`font-medium text-sm ${isVerified ? 'text-primary' : 'text-amber-600'}`}>
                                {isVerified ? 'Verified' : 'Pending'}
                              </p>
                            </div>
                            <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Dashboard;
