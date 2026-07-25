import { useState } from 'react';
import { Loader2, Zap, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { parseEdgeError } from '@/lib/edgeErrors';


/**
 * ProWeeklyPassCard — surfaces the non-renewing 7-day Pro pass on the
 * Pricing page as a lighter alternative to a monthly commitment.
 *
 * Uses the standard create-monetization-checkout function; the webhook
 * stamps access_starts_at / access_ends_at on the resulting purchase
 * (see monetization-webhook), and useHostEntitlements promotes the
 * user's tier to `pro` for the pass duration.
 */
export default function ProWeeklyPassCard() {
  const [busy, setBusy] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  const onClick = async () => {
    if (!user) {
      navigate(`/auth?returnTo=${encodeURIComponent('/pricing')}`);
      return;
    }
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-monetization-checkout', {
        body: {
          product_slug: 'pro_weekly_pass',
          success_path: '/payment-success?monetization=true',
          cancel_path: '/pricing',
        },
      });
      if (error) throw error;
      const url = (data as { url?: string })?.url;
      if (!url) throw new Error('No checkout URL returned');
      const top = window.top;
      if (top && top !== window) {
        try { top.location.href = url; return; } catch { /* fall through */ }
      }
      window.location.href = url;
    } catch (e) {
      const parsed = await parseEdgeError(e);
      toast.error(parsed?.message || (e instanceof Error ? e.message : 'Could not start checkout'));
      setBusy(false);
    }
  };


  return (
    <section className="mt-10 rounded-[20px] border-[1.5px] border-white/12 bg-gradient-to-br from-orange-500/[0.06] via-white/[0.02] to-transparent p-6 md:p-8">
      <div className="flex flex-col md:flex-row md:items-center gap-5 md:gap-8">
        <div className="flex-1 min-w-0">
          <div className="inline-flex items-center gap-1.5 rounded-full border-[1.5px] border-orange-400/40 bg-orange-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-orange-200">
            <Zap className="h-3 w-3" /> Try Pro for a week
          </div>
          <h3 className="mt-3 text-2xl md:text-3xl font-semibold text-foreground leading-tight">
            Pro Weekly Pass — 7 days, one payment, no auto-renew.
          </h3>
          <p className="mt-2 text-sm text-muted-foreground max-w-xl">
            Full Pro benefits — featured placement, lower fees, advanced analytics — for a single listing push
            or a busy sales week. Expires automatically; keep it going for $89/mo only if you love it.
          </p>
          <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-foreground/85">
            <li>· Featured placement</li>
            <li>· Lower Vendibook fees</li>
            <li>· Advanced analytics</li>
            <li>· Priority support</li>
          </ul>
        </div>
        <div className="shrink-0 flex items-center gap-4 md:flex-col md:items-end">
          <div className="text-right">
            <div className="text-4xl font-bold tracking-tight text-foreground tabular-nums">$29</div>
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">7 days · one-time</div>
          </div>
          <Button
            onClick={onClick}
            disabled={busy}
            className="h-11 rounded-md bg-orange-500 hover:bg-orange-500/90 text-white font-semibold px-5"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : (<>Start 7-day pass <ArrowRight className="ml-1.5 h-4 w-4" /></>)}
          </Button>
        </div>
      </div>
    </section>
  );
}
