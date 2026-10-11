import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { 
  Shield, TrendingUp, TrendingDown, AlertTriangle, MapPin, 
  Activity, ArrowRight, ArrowUpRight, ArrowDownRight, Minus,
  Users, DollarSign, Package, Eye, MessageSquare, Search,
  BarChart3, Zap, MousePointer, Headset, Download, Phone
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { HomepageVideoStatsCard } from '@/components/admin/HomepageVideoStatsCard';
import { useAdminCityStats, useAdminAlerts } from '@/hooks/useAnalyticsEvents';
import { 
  useAdminOverviewMetrics, 
  useUIFunnelMetrics, 
  useSupplyHealthMetrics, 
  useDemandHealthMetrics,
  useCTAClickMetrics 
} from '@/hooks/useAdminOverviewMetrics';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

// WoW indicator component
const WoWBadge = ({ value }: { value: number | null }) => {
  if (value === null) return <span className="text-xs text-muted-foreground">—</span>;
  const isPositive = value > 0;
  const isZero = value === 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${
      isPositive ? 'text-emerald-600' : isZero ? 'text-muted-foreground' : 'text-destructive'
    }`}>
      {isPositive ? <ArrowUpRight className="h-3 w-3" /> : isZero ? <Minus className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
      {Math.abs(value).toFixed(0)}%
    </span>
  );
};

const MetricCard = ({ 
  icon: Icon, label, value, subtext, wow, iconColor = 'text-foreground/70' 
}: { 
  icon: any; label: string; value: string | number; subtext?: string; wow?: number | null; iconColor?: string;
}) => (
  <Card>
    <CardContent className="pt-4 pb-3">
      <div className="flex items-center justify-between mb-1">
        <Icon className={`h-4 w-4 ${iconColor}`} />
        {wow !== undefined && <WoWBadge value={wow ?? null} />}
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
      {subtext && <p className="text-[10px] text-muted-foreground/60 mt-0.5">{subtext}</p>}
    </CardContent>
  </Card>
);

const AdminMetrics = () => {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isCheckingAdmin, setIsCheckingAdmin] = useState(true);
  const [dateRange, setDateRange] = useState<number>(7);

  const { data: overview, isLoading: overviewLoading } = useAdminOverviewMetrics(dateRange);
  const { data: funnel, isLoading: funnelLoading } = useUIFunnelMetrics(dateRange);
  const { data: supplyHealth, isLoading: supplyLoading } = useSupplyHealthMetrics();
  const { data: demandHealth, isLoading: demandLoading } = useDemandHealthMetrics(dateRange);
  const { data: ctaClicks, isLoading: ctaLoading } = useCTAClickMetrics(dateRange);
  const { data: cityStats, isLoading: cityLoading } = useAdminCityStats();
  const { data: alerts, isLoading: alertsLoading } = useAdminAlerts();

  // Voice call logs
  const { data: voiceLogs, isLoading: voiceLoading } = useQuery({
    queryKey: ['admin-voice-logs', dateRange],
    queryFn: async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - dateRange);
      const { data, error } = await supabase
        .from('analytics_events')
        .select('*')
        .eq('event_category', 'voice')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      return data || [];
    },
    staleTime: 1000 * 60 * 5,
  });

  useEffect(() => {
    const checkAdmin = async () => {
      if (!user) { setIsCheckingAdmin(false); return; }
      const { data } = await supabase.rpc('is_admin', { user_id: user.id });
      setIsAdmin(!!data);
      setIsCheckingAdmin(false);
    };
    checkAdmin();
  }, [user]);

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!isCheckingAdmin && !isAdmin && user) navigate('/');
  }, [isAdmin, isCheckingAdmin, user, navigate]);

  if (authLoading || isCheckingAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="space-y-4">
            <Skeleton className="h-8 w-64" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4, 5, 6, 7].map((i) => <Skeleton key={i} className="h-24" />)}
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!isAdmin) return null;

  const formatCurrency = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  const formatResponseTime = (ms: number | null) => {
    if (!ms) return 'N/A';
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  };

  const supplyTotal = (supplyHealth?.totalPublished || 0);
  const pctOf = (n: number, total: number) => total > 0 ? Math.round((n / total) * 100) : 0;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-foreground/5 rounded-lg">
              <BarChart3 className="h-6 w-6 text-foreground/70" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Vendibook Metrics</h1>
              <p className="text-sm text-muted-foreground">Overview, funnels, supply, demand & city liquidity</p>
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
              Admin
            </Button>
          </div>
        </div>

        {/* Alerts */}
        {!alertsLoading && alerts && alerts.length > 0 && (
          <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
            <CardContent className="py-3">
              <div className="flex items-center gap-3 flex-wrap">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
                <span className="font-medium text-amber-800 dark:text-amber-200 text-sm">Alerts:</span>
                {alerts.map((alert, i) => (
                  <Badge key={i} variant={alert.severity === 'critical' ? 'destructive' : 'secondary'}>
                    {alert.type === 'stale_drafts' && `${alert.count} stale drafts (>48h)`}
                    {alert.type === 'pending_requests' && `${alert.count} pending requests (>2h)`}
                    {alert.type === 'low_quality_listings' && `${alert.count} low quality listings`}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="overview">
              <Activity className="h-4 w-4 mr-1" /> Overview
            </TabsTrigger>
            <TabsTrigger value="funnel">
              <TrendingDown className="h-4 w-4 mr-1" /> UI Funnel
            </TabsTrigger>
            <TabsTrigger value="supply">
              <Package className="h-4 w-4 mr-1" /> Supply Health
            </TabsTrigger>
            <TabsTrigger value="demand">
              <Users className="h-4 w-4 mr-1" /> Demand Health
            </TabsTrigger>
            <TabsTrigger value="cities">
              <MapPin className="h-4 w-4 mr-1" /> City Scoreboard
            </TabsTrigger>
            <TabsTrigger value="cta">
              <MousePointer className="h-4 w-4 mr-1" /> CTA Clicks
            </TabsTrigger>
            <TabsTrigger value="voice">
              <Phone className="h-4 w-4 mr-1" /> Voice (Vendi)
            </TabsTrigger>
          </TabsList>

          {/* ═══════════════ OVERVIEW ═══════════════ */}
          <TabsContent value="overview">
            {overviewLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                {[1,2,3,4,5,6,7].map(i => <Skeleton key={i} className="h-24" />)}
              </div>
            ) : overview && (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                <MetricCard icon={Eye} label="Sessions" value={overview.sessions} wow={overview.sessionsWoW} />
                <MetricCard icon={Users} label="Signups" value={overview.signups} wow={overview.signupsWoW} />
                <MetricCard icon={Package} label="New Listings" value={overview.newListings} wow={overview.newListingsWoW} />
                <MetricCard icon={MessageSquare} label="Booking Requests" value={overview.bookingRequests} wow={overview.bookingRequestsWoW} />
                <MetricCard icon={Zap} label="Paid Bookings" value={overview.paidBookings} />
                <MetricCard icon={DollarSign} label="GMV" value={formatCurrency(overview.gmv)} iconColor="text-emerald-600" />
                <MetricCard icon={DollarSign} label="Net Revenue" value={formatCurrency(overview.netRevenue)} subtext={overview.gmv > 0 ? `${((overview.netRevenue / overview.gmv) * 100).toFixed(1)}% take rate` : undefined} iconColor="text-emerald-600" />
              </div>
            )}
          </TabsContent>

          {/* ═══════════════ UI FUNNEL ═══════════════ */}
          <TabsContent value="funnel">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <TrendingDown className="h-5 w-5 text-foreground/60" />
                    Demand Funnel
                  </CardTitle>
                  <CardDescription>Landing → Search → View → Contact → Pay</CardDescription>
                </CardHeader>
                <CardContent>
                  {funnelLoading ? (
                    <div className="space-y-3">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-12" />)}</div>
                  ) : funnel && (
                    <div className="space-y-4">
                      {funnel.steps.map((step, i) => {
                        const prevCount = i > 0 ? funnel.steps[i - 1].count : step.count;
                        const dropOff = i > 0 && prevCount > 0 ? ((prevCount - step.count) / prevCount * 100) : 0;
                        return (
                          <div key={i} className="space-y-1.5">
                            <div className="flex justify-between items-center text-sm">
                              <span className="font-medium">{step.name}</span>
                              <div className="flex items-center gap-2">
                                <span className="font-bold">{step.count.toLocaleString()}</span>
                                {i > 0 && (
                                  <Badge variant={dropOff > 70 ? 'destructive' : dropOff > 40 ? 'secondary' : 'outline'} className="text-[10px] px-1.5 py-0">
                                    {dropOff > 0 ? `-${dropOff.toFixed(0)}%` : '0%'} drop
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <Progress value={step.conversionRate} className="h-2.5" />
                            {i > 0 && (
                              <p className="text-[10px] text-muted-foreground">
                                {step.conversionRate.toFixed(1)}% of previous step
                              </p>
                            )}
                          </div>
                        );
                      })}
                      {/* Overall conversion */}
                      {funnel.steps.length > 1 && funnel.totalSessions > 0 && (
                        <div className="pt-3 border-t border-border">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">End-to-end conversion</span>
                            <span className="font-bold">
                              {((funnel.steps[funnel.steps.length - 1].count / funnel.totalSessions) * 100).toFixed(2)}%
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* CTA Performance mini-card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <MousePointer className="h-5 w-5 text-foreground/60" />
                    CTA Performance
                  </CardTitle>
                  <CardDescription>Click counts for key actions in period</CardDescription>
                </CardHeader>
                <CardContent>
                  {ctaLoading ? (
                    <div className="space-y-3">{[1,2,3,4].map(i => <Skeleton key={i} className="h-8" />)}</div>
                  ) : (
                    <div className="space-y-3">
                      {[
                        { key: 'hero_cta_click', label: 'Hero CTAs (Browse/List)' },
                        { key: 'search_submit', label: 'Search Submit' },
                        { key: 'search_focus', label: 'Search Focus' },
                        { key: 'hero_vendi_click', label: '"Let Vendi Guide Me"' },
                        { key: 'voice_widget_open', label: 'Voice Widget Open' },
                        { key: 'match_me_submit', label: '"Match Me" Submit' },
                        { key: 'create_listing_click', label: '"Create Listing" Click' },
                      ].map(item => (
                        <div key={item.key} className="flex justify-between items-center text-sm py-1 border-b border-border/50 last:border-0">
                          <span className="text-muted-foreground">{item.label}</span>
                          <span className="font-bold tabular-nums">{ctaClicks?.[item.key] || 0}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ═══════════════ SUPPLY HEALTH ═══════════════ */}
          <TabsContent value="supply">
            {supplyLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-32" />)}
              </div>
            ) : supplyHealth && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <MetricCard icon={Package} label="Drafts" value={supplyHealth.totalDrafts} />
                  <MetricCard icon={Package} label="Published" value={supplyHealth.totalPublished} iconColor="text-emerald-600" />
                  <MetricCard icon={DollarSign} label="Payouts Ready" value={supplyHealth.withStripeComplete} subtext={`of ${[...new Set([])].length || '?'} hosts`} />
                  <MetricCard icon={Shield} label="Verification Rate" value={`${supplyHealth.verificationRate.toFixed(0)}%`} />
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Listing Quality (Published)</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {[
                      { label: '6+ Photos', count: supplyHealth.withPhotos6Plus, pct: pctOf(supplyHealth.withPhotos6Plus, supplyTotal) },
                      { label: 'Price Set', count: supplyHealth.withPriceSet, pct: pctOf(supplyHealth.withPriceSet, supplyTotal) },
                      { label: 'Calendar / Availability', count: supplyHealth.withCalendarSet, pct: pctOf(supplyHealth.withCalendarSet, supplyTotal) },
                    ].map(item => (
                      <div key={item.label} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>{item.label}</span>
                          <span className="font-medium">{item.count} / {supplyTotal} ({item.pct}%)</span>
                        </div>
                        <Progress value={item.pct} className="h-2" />
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          {/* ═══════════════ DEMAND HEALTH ═══════════════ */}
          <TabsContent value="demand">
            {demandLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-24" />)}
              </div>
            ) : demandHealth && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <MetricCard icon={Search} label="Searches / User" value={demandHealth.searchesPerUser} />
                <MetricCard icon={Eye} label="Listing Views / User" value={demandHealth.listingViewsPerUser} />
                <MetricCard icon={MessageSquare} label="Messages / User" value={demandHealth.messagesPerUser} />
                <MetricCard icon={Zap} label="Requests / User" value={demandHealth.requestsPerUser} />
                <MetricCard icon={Users} label="Repeat Users (7d)" value={demandHealth.repeatUsers7d} />
                <MetricCard icon={Users} label="Repeat Users (30d)" value={demandHealth.repeatUsers30d} />
              </div>
            )}
          </TabsContent>

          {/* ═══════════════ CITY SCOREBOARD ═══════════════ */}
          <TabsContent value="cities">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <MapPin className="h-5 w-5 text-foreground/60" />
                  City Liquidity Scoreboard
                </CardTitle>
                <CardDescription>Active listings, requests, and response times per metro</CardDescription>
              </CardHeader>
              <CardContent>
                {cityLoading ? (
                  <Skeleton className="h-48" />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>City</TableHead>
                        <TableHead className="text-right">Active Listings</TableHead>
                        <TableHead className="text-right">Requests (30d)</TableHead>
                        <TableHead className="text-right">Liquidity</TableHead>
                        <TableHead className="text-right">Median Response</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cityStats?.map((city) => {
                        const liquidity = city.activeListings > 0 ? (city.requests / city.activeListings).toFixed(2) : '0';
                        return (
                          <TableRow key={city.city}>
                            <TableCell className="font-medium">{city.city}</TableCell>
                            <TableCell className="text-right">{city.activeListings}</TableCell>
                            <TableCell className="text-right">{city.requests}</TableCell>
                            <TableCell className="text-right">
                              <Badge variant={Number(liquidity) > 1 ? 'default' : 'secondary'}>
                                {liquidity}
                              </Badge>
                            </TableCell>
                            <TableCell className={`text-right ${
                              city.medianResponseMs && city.medianResponseMs < 2 * 60 * 60 * 1000
                                ? 'text-emerald-600' : 'text-amber-600'
                            }`}>
                              {formatResponseTime(city.medianResponseMs)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ═══════════════ CTA CLICKS ═══════════════ */}
          <TabsContent value="cta">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">CTA Click Breakdown</CardTitle>
                <CardDescription>All tracked CTA interactions for the selected period</CardDescription>
              </CardHeader>
              <CardContent>
                {ctaLoading ? (
                  <Skeleton className="h-48" />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>CTA Event</TableHead>
                        <TableHead className="text-right">Clicks</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.entries(ctaClicks || {})
                        .sort(([, a], [, b]) => b - a)
                        .map(([event, count]) => (
                          <TableRow key={event}>
                            <TableCell className="font-medium">{event.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</TableCell>
                            <TableCell className="text-right font-bold tabular-nums">{count}</TableCell>
                          </TableRow>
                        ))}
                      {(!ctaClicks || Object.keys(ctaClicks).length === 0) && (
                        <TableRow>
                          <TableCell colSpan={2} className="text-center text-muted-foreground py-8">
                            No CTA events tracked yet for this period.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ═══════════════ VOICE (VENDI) ═══════════════ */}
          <TabsContent value="voice">
            <div className="space-y-6">
              {/* Summary cards */}
              {(() => {
                const opens = voiceLogs?.filter(e => e.event_name === 'voice_widget_open').length || 0;
                const ends = voiceLogs?.filter(e => e.event_name === 'voice_call_end') || [];
                const completed = ends.length;
                const avgDuration = completed > 0
                  ? Math.round(ends.reduce((sum, e) => sum + ((e.metadata as any)?.duration_seconds || 0), 0) / completed)
                  : 0;
                return (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <MetricCard icon={Phone} label="Calls Started" value={opens} />
                    <MetricCard icon={Phone} label="Calls Completed" value={completed} iconColor="text-emerald-600" />
                    <MetricCard icon={Activity} label="Completion Rate" value={opens > 0 ? `${Math.round((completed / opens) * 100)}%` : '—'} />
                    <MetricCard icon={Activity} label="Avg Duration" value={avgDuration > 0 ? `${Math.floor(avgDuration / 60)}m ${avgDuration % 60}s` : '—'} />
                  </div>
                );
              })()}

              {/* Call log table */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Phone className="h-5 w-5 text-foreground/60" />
                    Voice Call Log
                  </CardTitle>
                  <CardDescription>All Vendi voice interactions in the selected period</CardDescription>
                </CardHeader>
                <CardContent>
                  {voiceLoading ? (
                    <Skeleton className="h-48" />
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Event</TableHead>
                          <TableHead>Source</TableHead>
                          <TableHead>Duration</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Session</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {voiceLogs && voiceLogs.length > 0 ? voiceLogs.map((log) => {
                          const meta = (log.metadata || {}) as Record<string, any>;
                          const dur = meta.duration_seconds;
                          return (
                            <TableRow key={log.id}>
                              <TableCell className="font-medium">
                                {log.event_name === 'voice_widget_open' ? '📞 Call Started' :
                                 log.event_name === 'voice_call_end' ? '✅ Call Ended' :
                                 log.event_name.replace(/_/g, ' ')}
                              </TableCell>
                              <TableCell className="text-muted-foreground">{meta.source || '—'}</TableCell>
                              <TableCell className="tabular-nums">
                                {dur ? `${Math.floor(dur / 60)}m ${dur % 60}s` : '—'}
                              </TableCell>
                              <TableCell className="text-muted-foreground">
                                {new Date(log.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground font-mono truncate max-w-[120px]">
                                {log.session_id?.slice(-8) || '—'}
                              </TableCell>
                            </TableRow>
                          );
                        }) : (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                              No voice events tracked yet for this period.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Quick Nav */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { label: 'Platform Finance', sub: 'Commission & payouts', icon: TrendingUp, color: 'text-emerald-500', path: '/admin/finance' },
            { label: 'Concierge Queue', sub: 'Asset match requests', icon: Headset, color: 'text-foreground/60', path: '/admin?tab=concierge' },
            { label: 'Listings Moderation', sub: 'Review & flag', icon: Package, color: 'text-foreground/60', path: '/admin/listings' },
            { label: 'Risk & Fraud', sub: 'Suspicious activity', icon: Shield, color: 'text-amber-500', path: '/admin/risk' },
          ].map(item => (
            <Button key={item.path} variant="outline" className="h-auto py-4 justify-start" onClick={() => navigate(item.path)}>
              <item.icon className={`h-5 w-5 mr-3 ${item.color}`} />
              <div className="text-left">
                <div className="font-medium">{item.label}</div>
                <div className="text-xs text-muted-foreground">{item.sub}</div>
              </div>
              <ArrowRight className="h-4 w-4 ml-auto" />
            </Button>
          ))}
        </div>

        {/* Homepage video funnel */}
        <HomepageVideoStatsCard days={dateRange} />
      </main>
      <Footer />
    </div>
  );
};

export default AdminMetrics;
