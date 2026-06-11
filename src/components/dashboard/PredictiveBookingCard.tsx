import { useEffect, useState } from 'react';
import { TrendingUp, Loader2, ChevronRight, Calendar, DollarSign, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Insight {
  type: string;
  title: string;
  recommendation: string;
  revenue_uplift_monthly: number;
  priority: number;
}

interface PredictiveData {
  headline: string;
  insights: Insight[];
}

const ICONS: Record<string, any> = {
  lead_time: Calendar,
  weekend_demand: TrendingUp,
  pricing: DollarSign,
  capacity: Zap,
  category: TrendingUp,
  general: };

export const PredictiveBookingCard = () => {
  const { session } = useAuth();
  const [data, setData] = useState<PredictiveData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session?.access_token) { setLoading(false); return; }
    const load = async () => {
      try {
        const { data: res, error: err } = await supabase.functions.invoke('predictive-booking-insights', {
          headers: { Authorization: `Bearer ${session.access_token}` }});
        if (err) throw err;
        if (res?.error) throw new Error(res.error);
        setData(res as PredictiveData);
      } catch (e: any) {
        setError(e?.message || 'Could not load predictions');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [session?.access_token]);

  const totalUplift = data?.insights.reduce((s, i) => s + (i.revenue_uplift_monthly || 0), 0) ?? 0;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
                
              </div>
              Predictive Booking
              <Badge variant="secondary" className="text-[10px]">AI</Badge>
            </CardTitle>
            <CardDescription className="text-xs mt-1">
              {loading ? 'Analyzing your booking patterns…' : data?.headline || 'Build booking history to unlock predictions'}
            </CardDescription>
          </div>
          {totalUplift > 0 && (
            <div className="text-right shrink-0">
              <div className="text-[10px] uppercase text-muted-foreground tracking-wide">Opportunity</div>
              <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                +${totalUplift.toLocaleString()}<span className="text-xs font-normal text-muted-foreground">/mo</span>
              </div>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
        ) : error ? (
          <p className="text-xs text-muted-foreground py-4 text-center">{error}</p>
        ) : !data?.insights?.length ? (
          <p className="text-xs text-muted-foreground py-4 text-center">
            Once you have a few completed bookings, Vendi will surface revenue opportunities here.
          </p>
        ) : (
          <div className="space-y-2">
            {data.insights
              .sort((a, b) => a.priority - b.priority)
              .map((insight, i) => {
                const Icon = ICONS[insight.type] || ;
                return (
                  <div key={i} className="group flex items-start gap-3 p-3 rounded-xl border border-border/60 hover:border-primary/40 hover:bg-primary/5 transition-all">
                    <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                      <Icon className="h-4 w-4 text-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2 mb-0.5">
                        <p className="text-sm font-semibold text-foreground">{insight.title}</p>
                        {insight.revenue_uplift_monthly > 0 && (
                          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 tabular-nums shrink-0">
                            +${insight.revenue_uplift_monthly.toLocaleString()}/mo
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">{insight.recommendation}</p>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
