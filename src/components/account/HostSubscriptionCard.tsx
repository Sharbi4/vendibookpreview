import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Crown, ExternalLink, AlertTriangle, CalendarClock, RefreshCw } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

const TIER_LABEL: Record<string, string> = {
  starter: 'Host Starter',
  pro: 'Host Pro',
  premium: 'Host Premium',
};

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30',
  trialing: 'bg-sky-500/15 text-sky-600 border-sky-500/30',
  past_due: 'bg-amber-500/15 text-amber-600 border-amber-500/30',
  unpaid: 'bg-red-500/15 text-red-600 border-red-500/30',
  canceled: 'bg-muted text-muted-foreground border-border',
  incomplete: 'bg-muted text-muted-foreground border-border',
};

function fmtDate(iso?: string | null) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch { return '—'; }
}

export function HostSubscriptionCard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [opening, setOpening] = useState(false);

  const { data: sub, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['host-subscription', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from('host_subscriptions')
        .select('*')
        .eq('user_id', user!.id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  const state = useMemo(() => {
    if (!sub) return { kind: 'none' as const };
    const status = sub.status ?? 'inactive';
    if (status === 'past_due' || status === 'unpaid') return { kind: 'past_due' as const };
    if (sub.cancel_at_period_end) return { kind: 'scheduled_cancel' as const };
    if (status === 'canceled') return { kind: 'canceled' as const };
    if (status === 'active' || status === 'trialing') return { kind: 'active' as const };
    return { kind: 'other' as const };
  }, [sub]);

  const openPortal = async () => {
    setOpening(true);
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal');
      if (error) throw error;
      if (data?.url) window.open(data.url, '_blank', 'noopener,noreferrer');
      else throw new Error('Portal URL missing');
    } catch (err) {
      toast({
        title: 'Could not open billing portal',
        description: err instanceof Error ? err.message : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setOpening(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="rounded-2xl border border-border shadow-sm bg-card">
        <CardContent className="py-8 grid place-items-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const tierLabel = sub?.tier ? (TIER_LABEL[sub.tier] ?? `Host ${sub.tier}`) : 'No active plan';
  const statusClass = STATUS_STYLES[sub?.status ?? ''] ?? 'bg-muted text-muted-foreground border-border';

  return (
    <Card className="rounded-2xl border border-border shadow-sm bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-lg">
          <span className="flex items-center gap-2">
            <div className="p-1 bg-primary rounded">
              <Crown className="h-3.5 w-3.5 text-primary-foreground" />
            </div>
            Host subscription
          </span>
          {sub?.status && (
            <Badge variant="outline" className={`capitalize ${statusClass}`}>
              {String(sub.status).replace(/_/g, ' ')}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {!sub ? (
          <div className="rounded-xl border border-dashed border-border p-4 bg-muted/20">
            <p className="text-sm text-muted-foreground mb-3">
              You're on the free tier. Upgrade to Host Pro for featured placement, advanced analytics, and priority support.
            </p>
            <Button asChild size="sm">
              <Link to="/host/plans">
                <Crown className="h-3.5 w-3.5 mr-1.5" />
                Explore Host Pro plans
              </Link>
            </Button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg border border-border/70 bg-muted/20 p-3">
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Plan</div>
                <div className="font-medium text-foreground mt-0.5">{tierLabel}</div>
              </div>
              <div className="rounded-lg border border-border/70 bg-muted/20 p-3">
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <CalendarClock className="h-3 w-3" />
                  {sub.cancel_at_period_end ? 'Access ends' : 'Renews'}
                </div>
                <div className="font-medium text-foreground mt-0.5">
                  {fmtDate(sub.cancel_at ?? sub.current_period_end)}
                </div>
              </div>
            </div>

            {state.kind === 'past_due' && (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 flex gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-800">
                  <div className="font-medium">Payment failed</div>
                  <p className="text-amber-700/90 mt-0.5">
                    Update your card in the billing portal to keep Pro perks active. We'll retry automatically.
                  </p>
                </div>
              </div>
            )}

            {state.kind === 'scheduled_cancel' && (
              <div className="rounded-lg border border-border bg-muted/20 p-3">
                <p className="text-xs text-muted-foreground">
                  Your plan is set to cancel on <strong className="text-foreground">{fmtDate(sub.current_period_end)}</strong>. You can reactivate anytime from the billing portal.
                </p>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={openPortal} disabled={opening}>
                {opening ? (
                  <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Opening…</>
                ) : (
                  <><ExternalLink className="h-3.5 w-3.5 mr-1.5" />Manage billing</>
                )}
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link to="/host/plans">Change plan</Link>
              </Button>
              <Button size="sm" variant="ghost" onClick={() => refetch()} disabled={isFetching}>
                <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isFetching ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default HostSubscriptionCard;
