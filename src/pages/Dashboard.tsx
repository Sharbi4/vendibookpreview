import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
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
  Mail
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
        {/* Hero Section - GRADIENT (matching Contact page) */}
        <section className="relative py-12 md:py-16 overflow-hidden">
          {/* Orange Gradient Background - #FF5124 based, subtle */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#FF5124]/8 via-[#FF5124]/5 to-amber-200/4" />
          
          {/* Decorative orbs - subtle orange hints */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-20 right-20 w-96 h-96 bg-[#FF5124]/6 rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-20 left-20 w-80 h-80 bg-[#FF5124]/5 rounded-full blur-3xl" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#FF5124]/4 rounded-full blur-3xl animate-pulse" />
          </div>
          
          <div className="container relative z-10 max-w-5xl">
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

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-4 max-w-2xl mx-auto">
              <Link to="/favorites" className="group">
                <div className="text-center p-4 rounded-2xl bg-card/50 backdrop-blur-sm border border-border/50 hover:shadow-lg transition-all hover:border-primary/30">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 text-white flex items-center justify-center mx-auto mb-2 group-hover:scale-105 transition-transform shadow-lg">
                    <Heart className="h-5 w-5" />
                  </div>
                  <div className="text-sm font-medium text-foreground">Favorites</div>
                </div>
              </Link>
              <Link to="/account" className="group">
                <div className="text-center p-4 rounded-2xl bg-card/50 backdrop-blur-sm border border-border/50 hover:shadow-lg transition-all hover:border-primary/30">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white flex items-center justify-center mx-auto mb-2 group-hover:scale-105 transition-transform shadow-lg">
                    <User className="h-5 w-5" />
                  </div>
                  <div className="text-sm font-medium text-foreground">Account</div>
                </div>
              </Link>
              <Link to="/notification-preferences" className="group">
                <div className="text-center p-4 rounded-2xl bg-card/50 backdrop-blur-sm border border-border/50 hover:shadow-lg transition-all hover:border-primary/30">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center mx-auto mb-2 group-hover:scale-105 transition-transform shadow-lg">
                    <Bell className="h-5 w-5" />
                  </div>
                  <div className="text-sm font-medium text-foreground">Notifications</div>
                </div>
              </Link>
            </div>
          </div>
        </section>

        {/* Main Content - NATURAL (matching Contact page) */}
        <section className="py-10 md:py-14 bg-background">
          <div className="container max-w-5xl">
            {/* Verification Progress */}
            <div className="mb-8">
              <Card className="border-0 shadow-xl bg-card/80 backdrop-blur-sm">
                <CardContent className="p-6">
                  <VerificationProgress />
                </CardContent>
              </Card>
            </div>

            {/* Dashboard Content - Tabs for dual-role users */}
            {isHost && isShopper ? (
              <Tabs defaultValue="host" className="w-full">
                {/* Enhanced Tab List (matching Contact page) */}
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

            {/* Account Info Card - Enhanced (matching Contact page styling) */}
            <div className="mt-8">
              <Card className="border-0 shadow-xl bg-gradient-to-br from-primary/5 to-primary/10">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground flex items-center justify-center shadow-lg">
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
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
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
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-green-600 text-white flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                            <User className="h-5 w-5" />
                          </div>
                          <div className="flex-1">
                            <p className="text-xs text-muted-foreground mb-1">Role</p>
                            <div className="flex gap-1.5 flex-wrap">
                              {roles.map((role) => (
                                <span 
                                  key={role}
                                  className="px-2 py-0.5 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground text-xs rounded-full capitalize font-medium shadow-sm"
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
                    <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow group">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-12 h-12 rounded-xl text-white flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform ${
                            isVerified 
                              ? 'bg-gradient-to-br from-primary to-primary/80' 
                              : 'bg-gradient-to-br from-amber-500 to-orange-600'
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
