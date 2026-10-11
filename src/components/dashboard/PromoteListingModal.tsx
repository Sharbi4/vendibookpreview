import { productCheckoutUrl, hostedCheckoutUrl } from '@/lib/payments/hostedCheckout';
import { useMemo, useState } from 'react';
import { format, addDays, differenceInDays, isBefore, startOfDay } from 'date-fns';
import {
  CalendarIcon,
  Loader2,
  Star,
  TrendingUp,
  Eye,
  Award,
  Flame,
  ExternalLink,
  History,
  ShieldAlert,
  CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { reportError } from '@/lib/errorReporter';
import {
  useListingBoostHistory,
  type BoostHistoryEntry,
} from '@/hooks/useListingBoostHistory';
import { useCatalogPrice } from '@/hooks/useCatalogPrices';
import { ACTIVE_PRODUCT_SLUGS } from '@/lib/monetization/catalogPricing';

interface PromoteListingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listingId: string;
  listingTitle: string;
}

const BOOST_DURATION_DAYS = 30;
const MAX_SCHEDULE_DAYS = 60;

const benefits = [
  { icon: TrendingUp, label: '3× more visibility in search' },
  { icon: Eye, label: 'Priority placement across category pages' },
  { icon: Award, label: `${BOOST_DURATION_DAYS} full days of exposure` },
  { icon: Star, label: 'Distinctive Featured badge' },
];

function formatMoney(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatRange(startsAt: string, endsAt: string) {
  return `${format(new Date(startsAt), 'MMM d, yyyy')} → ${format(new Date(endsAt), 'MMM d, yyyy')}`;
}

const STATUS_BADGE: Record<BoostHistoryEntry['status'], { label: string; className: string }> = {
  active: {
    label: 'Active',
    className: 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30',
  },
  queued: {
    label: 'Scheduled',
    className: 'bg-sky-500/15 text-sky-300 border border-sky-500/30',
  },
  expired: {
    label: 'Ended',
    className: 'bg-muted text-muted-foreground border border-border',
  },
  refunded: {
    label: 'Refunded',
    className: 'bg-rose-500/15 text-rose-300 border border-rose-500/30',
  },
};

export const PromoteListingModal = ({
  open,
  onOpenChange,
  listingId,
  listingTitle,
}: PromoteListingModalProps) => {
  const { toast } = useToast();
  const boostPrice = useCatalogPrice(ACTIVE_PRODUCT_SLUGS.featuredBoost);
  const { data, isLoading: historyLoading } = useListingBoostHistory(
    open ? listingId : null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);

  const today = useMemo(() => startOfDay(new Date()), []);
  const activeEndsAt = data?.currentEndsAt ? new Date(data.currentEndsAt) : null;

  // Default start: if a boost is already active, default to the moment it ends
  // (so purchases queue back-to-back with no overlap). Otherwise start today.
  const defaultStart = useMemo(() => {
    if (activeEndsAt && activeEndsAt.getTime() > today.getTime()) {
      return startOfDay(activeEndsAt);
    }
    return today;
  }, [activeEndsAt, today]);

  const [startDate, setStartDate] = useState<Date>(defaultStart);

  // Re-sync when the modal reopens with fresh data.
  useMemo(() => {
    setStartDate(defaultStart);
  }, [defaultStart]);

  const overlaps = !!(
    activeEndsAt &&
    startDate.getTime() < activeEndsAt.getTime() &&
    activeEndsAt.getTime() > Date.now()
  );

  const effectiveStart = overlaps ? startOfDay(activeEndsAt!) : startDate;
  const effectiveEnd = addDays(effectiveStart, BOOST_DURATION_DAYS);
  const daysUntilStart = Math.max(0, differenceInDays(effectiveStart, today));

  const handleCheckout = async () => {
    setIsSubmitting(true);
    try {
      const resp = { url: productCheckoutUrl(ACTIVE_PRODUCT_SLUGS.featuredBoost, listingId) };
      const popup = window.open(resp.url as string, '_blank');
      if (!popup || popup.closed) {
        toast({
          title: 'Popup blocked',
          description:
            'Your browser blocked the PayPal Checkout tab. Allow popups for Vendibook, then click "Promote listing" again.',
          variant: 'destructive',
        });
        return;
      }
      onOpenChange(false);
    } catch (err) {
      console.error('Boost checkout error:', err);
      toast({
        title: 'Something went wrong',
        description: "We couldn't start your promotion. Please try again.",
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Flame className="h-5 w-5 text-[hsl(14,100%,57%)]" />
            Promote listing
          </DialogTitle>
          <DialogDescription className="truncate">
            "{listingTitle}" — pick when your boost starts.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="promote" className="mt-2">
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="promote" className="gap-2">
              <Flame className="h-4 w-4" /> Promote
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <History className="h-4 w-4" /> History
              {data?.history?.length ? (
                <span className="ml-1 text-xs text-muted-foreground">
                  ({data.history.length})
                </span>
              ) : null}
            </TabsTrigger>
          </TabsList>

          {/* ─────────── Promote tab ─────────── */}
          <TabsContent value="promote" className="space-y-5 pt-4">
            {/* Active boost banner */}
            {data?.isActive && activeEndsAt && (
              <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 p-3 flex items-start gap-3">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-emerald-300">Boost currently active</p>
                  <p className="text-emerald-200/80 text-xs mt-0.5">
                    Ends {format(activeEndsAt, 'MMM d, yyyy')} · New purchases queue
                    back-to-back — never overlap.
                  </p>
                </div>
              </div>
            )}

            {/* Benefits — compact list, not a hero */}
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {benefits.map((b) => (
                <li
                  key={b.label}
                  className="flex items-center gap-2 text-sm text-muted-foreground"
                >
                  <b.icon className="h-4 w-4 text-amber-400 flex-shrink-0" />
                  <span>{b.label}</span>
                </li>
              ))}
            </ul>

            {/* Schedule */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Start date</label>
              <Popover open={dateOpen} onOpenChange={setDateOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal h-11',
                      !startDate && 'text-muted-foreground',
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(startDate, 'PPP')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={(d) => {
                      if (d) {
                        setStartDate(startOfDay(d));
                        setDateOpen(false);
                      }
                    }}
                    disabled={(d) =>
                      isBefore(d, today) ||
                      d.getTime() > addDays(today, MAX_SCHEDULE_DAYS).getTime()
                    }
                    initialFocus
                    className={cn('p-3 pointer-events-auto')}
                  />
                </PopoverContent>
              </Popover>

              {/* End-date preview */}
              <div className="rounded-md border border-border bg-muted/30 p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Boost window</span>
                  <span className="font-medium text-foreground">
                    {formatRange(effectiveStart.toISOString(), effectiveEnd.toISOString())}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-1.5 text-xs text-muted-foreground">
                  <span>
                    {daysUntilStart === 0
                      ? 'Starts today'
                      : `Starts in ${daysUntilStart} day${daysUntilStart === 1 ? '' : 's'}`}
                  </span>
                  <span>{BOOST_DURATION_DAYS} days total</span>
                </div>
              </div>

              {/* Overlap notice */}
              {overlaps && (
                <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 flex items-start gap-2">
                  <ShieldAlert className="h-4 w-4 text-amber-400 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-amber-200/90">
                    You chose a date during an active boost. To avoid overlap, your
                    new boost will start when the current one ends
                    ({format(activeEndsAt!, 'MMM d, yyyy')}).
                  </p>
                </div>
              )}
            </div>

            {/* Price + CTA */}
            <div className="border-t border-border pt-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm text-muted-foreground">One-time fee</p>
                  <p className="text-xs text-muted-foreground">
                    {BOOST_DURATION_DAYS} days · no auto-renew
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-bold text-foreground">
                    {boostPrice.label}
                  </span>
                  {/* Tax is computed server-side at checkout, so this is pre-tax. */}
                  <p className="text-[11px] text-muted-foreground">+ sales tax</p>
                </div>
              </div>

              <Button
                variant="dark-shine"
                className="w-full rounded-xl h-12"
                onClick={handleCheckout}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Flame className="h-4 w-4 mr-2" />
                )}
                {daysUntilStart === 0 ? 'Promote listing' : 'Schedule promotion'}
              </Button>
            </div>
          </TabsContent>

          {/* ─────────── History tab ─────────── */}
          <TabsContent value="history" className="pt-4">
            {historyLoading ? (
              <div className="flex items-center justify-center py-10 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : !data?.history?.length ? (
              <div className="text-center py-10 text-sm text-muted-foreground">
                <History className="h-6 w-6 mx-auto mb-2 opacity-50" />
                No promotions purchased yet for this listing.
              </div>
            ) : (
              <ul className="divide-y divide-border rounded-md border border-border">
                {data.history.map((entry) => {
                  const badge = STATUS_BADGE[entry.status];
                  return (
                    <li
                      key={entry.session_id}
                      className="p-3 flex items-start justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground">
                            Featured Boost — {BOOST_DURATION_DAYS} days
                          </span>
                          <Badge
                            variant="secondary"
                            className={cn('text-[10px] h-5 px-1.5', badge.className)}
                          >
                            {badge.label}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatRange(entry.starts_at, entry.ends_at)}
                        </p>
                        <p className="text-[11px] text-muted-foreground/70 mt-0.5">
                          Paid {format(new Date(entry.paid_at), 'MMM d, yyyy')} ·{' '}
                          {formatMoney(entry.amount_cents)}
                        </p>
                      </div>
                      {entry.receipt_url && (
                        <a
                          href={entry.receipt_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline flex-shrink-0"
                        >
                          Receipt
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default PromoteListingModal;
