import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Shield, TrendingUp, TrendingDown, AlertTriangle, MapPin, 
  Clock, Users, FileText, Activity, ArrowRight, ChevronDown
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useAdminFunnelMetrics, useAdminCityStats, useAdminAlerts } from '@/hooks/useAnalyticsEvents';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const AdminMetrics = () => {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isCheckingAdmin, setIsCheckingAdmin] = useState(true);
  const [dateRange, setDateRange] = useState<number>(7);

  const { data: funnelData, isLoading: funnelLoading } = useAdminFunnelMetrics(dateRange);
  const { data: cityStats, isLoading: cityLoading } = useAdminCityStats();
  const { data: alerts, isLoading: alertsLoading } = useAdminAlerts();

  useEffect(() => {
    const checkAdmin = async () => {
      if (!user) {
        setIsCheckingAdmin(false);
        return;
      }
      
      const { data } = await supabase.rpc('is_admin', { user_id: user.id });
      setIsAdmin(!!data);
      setIsCheckingAdmin(false);
    };
    
    checkAdmin();
  }, [user]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!isCheckingAdmin && !isAdmin && user) {
      navigate('/');
    }
  }, [isAdmin, isCheckingAdmin, user, navigate]);

  if (authLoading || isCheckingAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="space-y-4">
            <Skeleton className="h-8 w-64" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-64" />
              ))}
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  const formatResponseTime = (ms: number | null) => {
    if (!ms) return 'N/A';
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Activity className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Operator Metrics</h1>
              <p className="text-muted-foreground">Funnel analysis, liquidity, and alerts</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Select value={String(dateRange)} onValueChange={(v) => setDateRange(Number(v))}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
            
            <Button variant="outline" onClick={() => navigate('/admin')}>
              <Shield className="h-4 w-4 mr-2" />
              Admin Dashboard
            </Button>
          </div>
        </div>

        {/* Alerts Banner */}
        {!alertsLoading && alerts && alerts.length > 0 && (
          <Card className="mb-6 border-amber-200 bg-amber-50 dark:bg-amber-950/20">
            <CardContent className="py-4">
              <div className="flex items-center gap-3 flex-wrap">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
                <span className="font-medium text-amber-800 dark:text-amber-200">Active Alerts:</span>
                {alerts.map((alert, i) => (
                  <Badge 
                    key={i} 
                    variant={alert.severity === 'critical' ? 'destructive' : 'secondary'}
                    className="flex items-center gap-1"
                  >
                    {alert.type === 'stale_drafts' && `${alert.count} stale drafts (>48h)`}
                    {alert.type === 'pending_requests' && `${alert.count} pending requests (>2h)`}
                    {alert.type === 'low_quality_listings' && `${alert.count} low quality listings`}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Supply Funnel */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-emerald-500" />
                Supply Funnel
              </CardTitle>
              <CardDescription>
                Host listing creation flow
                {funnelData?.supplyFunnel.dropOffStep && (
                  <Badge variant="outline" className="ml-2 text-amber-600 border-amber-300">
                    Biggest drop: {funnelData.supplyFunnel.dropOffStep} ({funnelData.supplyFunnel.dropOffRate.toFixed(0)}%)
                  </Badge>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {funnelLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-10" />
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {funnelData?.supplyFunnel.steps.map((step, i) => (
                    <div key={i} className="space-y-1">
                      <div className="flex justify-between items-center text-sm">
                        <span className="font-medium">{step.name}</span>
                        <span className="text-muted-foreground">
                          {step.count} <span className="text-xs">({step.conversionRate.toFixed(0)}%)</span>
                        </span>
                      </div>
                      <Progress 
                        value={step.conversionRate} 
                        className={`h-2 ${
                          funnelData.supplyFunnel.dropOffStep === step.name.toLowerCase().replace(/ /g, '_') 
                            ? 'bg-amber-100' 
                            : ''
                        }`}
                      />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Demand Funnel */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingDown className="h-5 w-5 text-blue-500" />
                Demand Funnel
              </CardTitle>
              <CardDescription>
                Shopper booking flow
                {funnelData?.demandFunnel.dropOffStep && (
                  <Badge variant="outline" className="ml-2 text-amber-600 border-amber-300">
                    Biggest drop: {funnelData.demandFunnel.dropOffStep} ({funnelData.demandFunnel.dropOffRate.toFixed(0)}%)
                  </Badge>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {funnelLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-10" />
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {funnelData?.demandFunnel.steps.map((step, i) => (
                    <div key={i} className="space-y-1">
                      <div className="flex justify-between items-center text-sm">
                        <span className="font-medium">{step.name}</span>
                        <span className="text-muted-foreground">
                          {step.count} <span className="text-xs">({step.conversionRate.toFixed(0)}%)</span>
                        </span>
                      </div>
                      <Progress value={step.conversionRate} className="h-2" />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* City Liquidity */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              Marketplace Liquidity by City
            </CardTitle>
            <CardDescription>Active listings, requests, and response times</CardDescription>
          </CardHeader>
          <CardContent>
            {cityLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-32" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {cityStats?.map((city) => (
                  <Card key={city.city} className="bg-muted/30">
                    <CardContent className="pt-4">
                      <h3 className="font-semibold text-lg mb-3">{city.city}</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Active Listings</span>
                          <span className="font-medium">{city.activeListings}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Requests (30d)</span>
                          <span className="font-medium">{city.requests}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Median Response</span>
                          <span className={`font-medium ${
                            city.medianResponseMs && city.medianResponseMs < 2 * 60 * 60 * 1000 
                              ? 'text-emerald-600' 
                              : 'text-amber-600'
                          }`}>
                            {formatResponseTime(city.medianResponseMs)}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Button 
            variant="outline" 
            className="h-auto py-4 justify-start"
            onClick={() => navigate('/admin/finance')}
          >
            <TrendingUp className="h-5 w-5 mr-3 text-emerald-500" />
            <div className="text-left">
              <div className="font-medium">Platform Finance</div>
              <div className="text-xs text-muted-foreground">Commission & payouts</div>
            </div>
            <ArrowRight className="h-4 w-4 ml-auto" />
          </Button>
          
          <Button 
            variant="outline" 
            className="h-auto py-4 justify-start"
            onClick={() => navigate('/admin?tab=concierge')}
          >
            <Users className="h-5 w-5 mr-3 text-purple-500" />
            <div className="text-left">
              <div className="font-medium">Concierge Queue</div>
              <div className="text-xs text-muted-foreground">View asset match requests</div>
            </div>
            <ArrowRight className="h-4 w-4 ml-auto" />
          </Button>
          
          <Button 
            variant="outline" 
            className="h-auto py-4 justify-start"
            onClick={() => navigate('/admin/listings')}
          >
            <FileText className="h-5 w-5 mr-3 text-blue-500" />
            <div className="text-left">
              <div className="font-medium">Listings Moderation</div>
              <div className="text-xs text-muted-foreground">Review new & flagged listings</div>
            </div>
            <ArrowRight className="h-4 w-4 ml-auto" />
          </Button>
          
          <Button 
            variant="outline" 
            className="h-auto py-4 justify-start"
            onClick={() => navigate('/admin/risk')}
          >
            <Shield className="h-5 w-5 mr-3 text-amber-500" />
            <div className="text-left">
              <div className="font-medium">Risk & Fraud</div>
              <div className="text-xs text-muted-foreground">Monitor suspicious activity</div>
            </div>
            <ArrowRight className="h-4 w-4 ml-auto" />
          </Button>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AdminMetrics;
