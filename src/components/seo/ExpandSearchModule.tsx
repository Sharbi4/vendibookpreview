import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, Bell, CheckCircle2, Loader2, ShieldCheck, Truck, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { trackEvent } from '@/lib/analytics';
import type { NationwideInventory } from '@/hooks/useNationwideInventory';

/** Count at or below which a landing/hub page is treated as low inventory. */
export const LOW_INVENTORY_THRESHOLD = 6;
/** Count at or below which the slim near-the-top line is also shown. */
export const NEAR_EMPTY_THRESHOLD = 2;

export type LowInventoryCta = 'nationwide' | 'freight' | 'notify' | 'sell';

const trackCta = (pageSlug: string, resultCount: number, cta: LowInventoryCta) =>
  trackEvent({
    category: 'Low Inventory',
    action: 'low_inventory_cta_click',
    label: pageSlug,
    metadata: { page_slug: pageSlug, result_count: resultCount, cta },
  });

interface CommonProps {
  /** Canonical path of the page, used as the tracking slug. */
  pageSlug: string;
  /** Live result count for the page's own filter. */
  resultCount: number;
  nationwide: NationwideInventory;
}

/**
 * Slim one-line escape hatch rendered near the top of the results when a page
 * has almost nothing local. Never a card — the local inventory stays first.
 */
export const LowInventoryInlineLine = ({ pageSlug, resultCount, nationwide }: CommonProps) => {
  if (nationwide.loading || nationwide.count <= resultCount) return null;
  return (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
      <span>
        Only {resultCount} nearby.
      </span>
      <Link
        to={nationwide.href}
        onClick={() => trackCta(pageSlug, resultCount, 'nationwide')}
        className="inline-flex items-center gap-1 font-medium text-primary underline underline-offset-4 decoration-primary/40 hover:decoration-primary"
      >
        See {nationwide.count} nationwide
        <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
      </Link>
    </p>
  );
};

interface NotifyFormProps {
  pageSlug: string;
  resultCount: number;
  category?: string;
  mode?: string;
}

const NotifyForm = ({ pageSlug, resultCount, category, mode }: NotifyFormProps) => {
  const [email, setEmail] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error('Please enter a valid email address');
      return;
    }
    if (!/^\d{5}(-\d{4})?$/.test(zipCode)) {
      toast.error('Please enter a valid US zip code');
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.from('availability_alerts').insert({
        email: email.trim().toLowerCase(),
        zip_code: zipCode.trim(),
        category: category ?? null,
        mode: mode ?? null,
        radius_miles: 50,
      });
      if (error) throw error;
      trackCta(pageSlug, resultCount, 'notify');
      setDone(true);
      toast.success("You're on the list — we'll email you when one lists nearby.");
    } catch {
      toast.error('Could not set up that alert. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <p className="flex items-center gap-2 text-sm text-foreground">
        <CheckCircle2 className="h-4 w-4 text-primary" aria-hidden="true" />
        We'll email you as soon as one lists near {zipCode}.
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_9rem_auto]">
        <div className="space-y-1.5">
          <Label htmlFor="low-inv-email" className="text-xs font-medium text-muted-foreground">
            Email
          </Label>
          <Input
            id="low-inv-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            maxLength={255}
            className="h-11 rounded-xl text-base"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="low-inv-zip" className="text-xs font-medium text-muted-foreground">
            Zip code
          </Label>
          <Input
            id="low-inv-zip"
            type="text"
            value={zipCode}
            onChange={(e) => setZipCode(e.target.value)}
            placeholder="85001"
            maxLength={10}
            className="h-11 rounded-xl text-base"
          />
        </div>
        <div className="flex items-end">
          <Button
            type="submit"
            variant="outline"
            className="h-11 w-full rounded-xl sm:w-auto"
            disabled={submitting || !email || !zipCode}
          >
            {submitting ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Setting up</>
            ) : (
              <><Bell className="mr-2 h-4 w-4" /> Notify me</>
            )}
          </Button>
        </div>
      </div>
    </form>
  );
};

export interface ExpandSearchModuleProps extends CommonProps {
  /** Renders the notify form + seller CTA (zero-result state). */
  zeroResults?: boolean;
  /** Seller cross-link shown in the zero-result state. */
  sellCta?: { label: string; href: string };
  /** Context for the availability alert record. */
  alertContext?: { category?: string; mode?: string };
  className?: string;
}

/**
 * "Expand your search" module for thin landing/hub pages. Turns a near-empty
 * result set into a national + freight funnel instead of a dead end.
 * Always rendered BELOW the local results (or as the primary content when
 * there are none). Counts shown are live and never rounded.
 */
export const ExpandSearchModule = ({
  pageSlug,
  resultCount,
  nationwide,
  zeroResults = false,
  sellCta,
  alertContext,
  className,
}: ExpandSearchModuleProps) => {
  const reduce = useReducedMotion();
  const viewed = useRef(false);

  useEffect(() => {
    if (viewed.current || nationwide.loading) return;
    viewed.current = true;
    trackEvent({
      category: 'Low Inventory',
      action: 'low_inventory_module_viewed',
      label: pageSlug,
      metadata: {
        page_slug: pageSlug,
        result_count: resultCount,
        nationwide_count: nationwide.count,
        nationwide_label: nationwide.label,
        broadened: nationwide.broadened,
      },
    });
  }, [pageSlug, resultCount, nationwide.loading, nationwide.count, nationwide.label, nationwide.broadened]);

  return (
    <motion.section
      aria-labelledby="expand-search-heading"
      initial={reduce ? false : { opacity: 0, y: 12 }}
      whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className={`sale-light rounded-[28px] border border-border bg-card px-6 py-8 md:px-10 md:py-10 ${className ?? ''}`}
    >
      <div className="max-w-2xl space-y-3">
        <h2 id="expand-search-heading" className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground">
          Not seeing the right one nearby? Buy from anywhere.
        </h2>
        <p className="text-base text-muted-foreground leading-relaxed">
          Most Vendibook buyers ship. We'll handle getting it to you.
        </p>
        {!nationwide.loading && nationwide.count > 0 && (
          <p className="text-lg font-medium text-foreground">
            {nationwide.count} {nationwide.label} available nationwide
          </p>
        )}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Button asChild variant="dark-shine" className="rounded-xl">
          <Link
            to={nationwide.href}
            onClick={() => trackCta(pageSlug, resultCount, 'nationwide')}
          >
            See all {nationwide.label} nationwide
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
        <Button asChild variant="outline" className="rounded-xl">
          <Link
            to="/vendibook-freight"
            onClick={() => trackCta(pageSlug, resultCount, 'freight')}
          >
            How delivery works
          </Link>
        </Button>
      </div>

      <ul className="mt-7 grid gap-3 border-t border-border pt-6 sm:grid-cols-3">
        <li className="flex items-start gap-2.5 text-sm text-muted-foreground">
          <Truck className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
          <span>Shipping quotes to your door</span>
        </li>
        <li className="flex items-start gap-2.5 text-sm text-muted-foreground">
          <Wallet className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
          <span>
            <Link to="/financing" className="underline underline-offset-4 decoration-border hover:text-primary">
              Financing
            </Link>{' '}
            can include freight
          </span>
        </li>
        <li className="flex items-start gap-2.5 text-sm text-muted-foreground">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
          <span>Payment protected until you confirm delivery</span>
        </li>
      </ul>

      {zeroResults && (
        <div className="mt-8 space-y-6 border-t border-border pt-6">
          <div className="space-y-3 max-w-xl">
            <h3 className="text-base font-semibold text-foreground">
              Get notified when one lists near you
            </h3>
            <NotifyForm
              pageSlug={pageSlug}
              resultCount={resultCount}
              category={alertContext?.category}
              mode={alertContext?.mode}
            />
          </div>
          {sellCta && (
            <p className="text-sm text-muted-foreground">
              Have one to sell?{' '}
              <Link
                to={sellCta.href}
                onClick={() => trackCta(pageSlug, resultCount, 'sell')}
                className="font-medium text-primary underline underline-offset-4 decoration-primary/40 hover:decoration-primary"
              >
                {sellCta.label}
              </Link>
            </p>
          )}
        </div>
      )}
    </motion.section>
  );
};

export default ExpandSearchModule;
