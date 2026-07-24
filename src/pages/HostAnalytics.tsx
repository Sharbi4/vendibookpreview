import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { usePageTracking } from '@/hooks/usePageTracking';
import { Navigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ConversionFunnel } from '@/components/analytics/ConversionFunnel';
import { RevenueChart } from '@/components/analytics/RevenueChart';
import { TrafficSourcesCard } from '@/components/analytics/TrafficSourcesCard';
import { CompetitorPricingCard } from '@/components/analytics/CompetitorPricingCard';
import { Button } from '@/components/ui/button';
import { Download, RefreshCw } from 'lucide-react';
import { useHostAnalytics } from '@/hooks/useHostAnalytics';
import { toast } from '@/hooks/use-toast';
import { ProFeatureGate } from '@/components/host/ProFeatureGate';


const HostAnalytics = () => {
  const { user, isLoading } = useAuth();
  usePageTracking();
  const { rollup } = useHostAnalytics(30);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace />;

  const handleRefresh = async () => {
    toast({ title: 'Refreshing analytics…' });
    await rollup.mutateAsync();
    toast({ title: 'Analytics updated' });
  };

  const handleDownload = async () => {
    const { default: jsPDF } = await import('jspdf');
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('Vendibook Analytics Report', 14, 18);
    doc.setFontSize(10);
    doc.text(`Generated ${new Date().toLocaleDateString()}`, 14, 26);
    doc.setFontSize(12);
    doc.text('Open your dashboard at vendibook.com/dashboard?view=analytics for live charts.', 14, 40);
    doc.save(`vendibook-analytics-${new Date().toISOString().split('T')[0]}.pdf`);
    toast({ title: 'PDF downloaded' });
  };

  return (
    <DashboardLayout mode="host" onModeChange={() => {}} isHost={true}>
      <div className="space-y-6">
        <HostPlanRibbon />
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Analytics</h1>
            <p className="text-sm text-muted-foreground">
              Conversion funnel, revenue, traffic sources, and pricing intelligence
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={rollup.isPending}>
              <RefreshCw className={`h-4 w-4 mr-1.5 ${rollup.isPending ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download className="h-4 w-4 mr-1.5" />
              Export PDF
            </Button>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-4">
          <ConversionFunnel days={30} />
          <RevenueChart />
          <ProFeatureGate
            requires="pro"
            featureName="Traffic sources & attribution"
            description="See which channels drive views, saves, and bookings so you can double down on what's working."
            preview
          >
            <TrafficSourcesCard days={30} />
          </ProFeatureGate>
          <ProFeatureGate
            requires="pro"
            featureName="Competitor pricing intelligence"
            description="Benchmark your rates against comparable listings in your market — updated weekly."
            preview
          >
            <CompetitorPricingCard />
          </ProFeatureGate>
        </div>

      </div>
    </DashboardLayout>
  );
};

export default HostAnalytics;
