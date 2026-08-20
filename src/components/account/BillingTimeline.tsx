import { useQuery } from '@tanstack/react-query';
import { CalendarClock, CreditCard, Loader2, Receipt, RefreshCw, ShieldCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

type Entry = {
  id: string;
  at: string;
  kind: 'payment' | 'purchase' | 'state';
  title: string;
  detail?: string | null;
  amount_cents?: number | null;
  currency?: string | null;
  status?: string | null;
};

type TimelineResponse = {
  entries: Entry[];
  subscription: {
    status?: string | null;
    plan_name?: string | null;
    next_billing_at?: string | null;
    cancel_at_period_end?: boolean;
  } | null;
};

const money = (cents?: number | null, currency = 'USD') =>
  typeof cents === 'number'
    ? new Intl.NumberFormat('en-US', { style: 'currency', currency: currency || 'USD' }).format(cents / 100)
    : null;

const day = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

const icons = {
  payment: CreditCard,
  purchase: Receipt,
  state: ShieldCheck,
} as const;

export function BillingTimeline() {
  const { user } = useAuth();

  const { data, isLoading, isFetching, refetch, error } = useQuery({
    queryKey: ['billing-timeline', user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<TimelineResponse> => {
      const { data, error } = await supabase.functions.invoke('billing-timeline');
      if (error) throw error;
      return data as TimelineResponse;
    },
  });

  if (!user) return null;

  const entries = data?.entries ?? [];
  const sub = data?.subscription ?? null;

  return (
    <Card className="rounded-3xl border border-border bg-card">
      <CardHeader className="flex flex-row items-start justify-between gap-4 pb-3">
        <div>
          <CardTitle className="text-base font-semibold">Billing timeline</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Payments, purchases, and membership changes from the last 3 months.
          </p>
        </div>
        <Button size="sm" variant="ghost" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isFetching ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </CardHeader>

      <CardContent className="space-y-5">
        {sub && (
          <div className="flex items-center gap-3 rounded-2xl bg-muted/40 px-4 py-3">
            <CalendarClock className="h-4 w-4 text-primary shrink-0" />
            <div className="text-sm">
              <span className="text-muted-foreground">
                {sub.cancel_at_period_end ? 'Access ends ' : 'Next billing date '}
              </span>
              <span className="font-medium text-foreground">{day(sub.next_billing_at)}</span>
              {sub.plan_name && <span className="text-muted-foreground"> · {sub.plan_name}</span>}
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="py-8 grid place-items-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <p className="text-sm text-muted-foreground py-4">
            We couldn’t load your billing history right now. Please try again.
          </p>
        ) : entries.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">
            No billing activity in the last 3 months.
          </p>
        ) : (
          <ol className="relative space-y-0">
            {entries.map((e, i) => {
              const Icon = icons[e.kind] ?? Receipt;
              const amount = money(e.amount_cents, e.currency ?? 'USD');
              return (
                <li key={e.id} className="relative flex gap-3 pb-5 last:pb-0">
                  {i < entries.length - 1 && (
                    <span className="absolute left-[15px] top-8 bottom-0 w-px bg-border" aria-hidden />
                  )}
                  <span className="relative z-10 mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full border border-border bg-background">
                    <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="text-sm font-medium text-foreground truncate">{e.title}</p>
                      {amount && (
                        <span
                          className={`text-sm font-medium shrink-0 ${
                            e.status === 'refunded' ? 'text-muted-foreground line-through' : 'text-foreground'
                          }`}
                        >
                          {amount}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {day(e.at)}
                      {e.detail ? ` · ${e.detail}` : ''}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}

export default BillingTimeline;
