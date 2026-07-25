/**
 * ProductLearnMoreOverlay — one reusable "Learn more" surface for every
 * sellable item on the app (plans, weekly pass, add-ons, one-time tool
 * unlocks). Reads a curated LearnMoreEntry from `learnMoreCatalog.ts` and
 * falls back to the raw MonetizationProduct row when no curated entry
 * exists.
 *
 * - Desktop: Radix Dialog, glass, r-lg, max-w-2xl.
 * - Mobile: Radix Sheet from bottom.
 * - Deep-link: `?learn=<slug>` opens the overlay for the matching product.
 * - Analytics: fires `learn_more_opened` on open and `learn_more_converted`
 *   when the buy CTA inside the overlay is clicked.
 * - Consent gate is preserved — the buy CTA calls the exact same
 *   `onBuy` handler the parent card uses, so subscription consent + Stripe
 *   checkout flow are unchanged.
 */
import * as React from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowRight, X, Check, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { trackLeadEvent } from '@/lib/leadTracking';
import {
  effectivePriceCents,
  formatUsd,
  type MonetizationProduct,
} from '@/lib/monetization/products';
import {
  getLearnMoreEntry,
  resolveLearnMoreSlug,
} from '@/lib/monetization/learnMoreCatalog';

export interface ProductLearnMoreOverlayProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: MonetizationProduct;
  /** Which UI surface opened the overlay (analytics). */
  surface: string;
  /** Optional pre-selected billing interval label ("/mo", "/yr", "one-time"). */
  billingLabel?: string;
  /** CTA label — matches the parent card's CTA to keep the flow consistent. */
  ctaLabel?: string;
  /** Whether the CTA is currently in a loading state (parent-driven). */
  ctaBusy?: boolean;
  /** Called when the user clicks the buy CTA inside the overlay. */
  onBuy: () => void | Promise<void>;
  /** Optional deep-link key. Defaults to product.slug. */
  deepLinkSlug?: string;
}

export function ProductLearnMoreOverlay({
  open,
  onOpenChange,
  product,
  surface,
  billingLabel,
  ctaLabel,
  ctaBusy,
  onBuy,
  deepLinkSlug,
}: ProductLearnMoreOverlayProps) {
  const isMobile = useIsMobile();
  const entry = getLearnMoreEntry(product.slug);
  const priceCents = effectivePriceCents(product);
  const recurring = product.billing_type === 'recurring';
  const label = billingLabel ?? (recurring ? '/mo' : 'one-time');
  const openedRef = React.useRef(false);

  React.useEffect(() => {
    if (open && !openedRef.current) {
      openedRef.current = true;
      trackLeadEvent('learn_more_opened', {
        product_slug: product.slug,
        surface,
      });
    }
    if (!open) openedRef.current = false;
  }, [open, product.slug, surface]);

  const handleBuy = async () => {
    trackLeadEvent('learn_more_converted', {
      product_slug: product.slug,
      surface,
    });
    await onBuy();
  };

  const Body = (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-orange-300">
          {product.category.replace(/_/g, ' ')}
        </p>
        <h2 className="font-display text-2xl leading-tight text-foreground">
          {product.name.replace(/\s*\(.*\)$/, '')}
        </h2>
        <p className="text-sm text-foreground/80">
          {entry?.promise ?? product.description ?? 'Everything you need to close the next booking or sale.'}
        </p>
        {entry?.bestFor && (
          <p className="text-xs text-muted-foreground">{entry.bestFor}</p>
        )}
      </header>

      <div className="flex items-baseline gap-2 rounded-md border-[1.5px] border-white/12 bg-white/[0.03] px-4 py-3">
        <span className="text-3xl font-bold text-foreground tabular-nums">
          {formatUsd(priceCents)}
        </span>
        <span className="text-sm text-muted-foreground">{label}</span>
        {recurring && (
          <span className="ml-auto text-[11px] text-muted-foreground">
            Cancel anytime online.
          </span>
        )}
      </div>

      <section>
        <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          What you get
        </h3>
        <ul className="space-y-3">
          {(entry?.outcomes ?? deriveOutcomes(product)).map((o, i) => {
            const Icon = o.icon;
            return (
              <li key={i} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md border-[1.5px] border-white/12 bg-white/[0.04] text-orange-300">
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                <div>
                  <p className="text-sm font-semibold text-foreground">{o.title}</p>
                  <p className="text-xs leading-relaxed text-foreground/70">{o.body}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {entry?.screenshots && entry.screenshots.length > 0 && (
        <section>
          <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            See it in action
          </h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {entry.screenshots.slice(0, 3).map((s, i) => (
              <figure
                key={i}
                className="overflow-hidden rounded-md border-[1.5px] border-white/12 bg-black/40"
              >
                <img
                  src={s.src}
                  alt={s.alt}
                  loading="lazy"
                  className="h-40 w-full object-cover"
                />
                <figcaption className="px-3 py-2 text-[11px] text-foreground/70">
                  {s.caption}
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}

      {product.refund_policy && (
        <p className="text-[11px] text-muted-foreground">
          Refunds: {product.refund_policy}
        </p>
      )}
    </div>
  );

  const Footer = (
    <div className="sticky bottom-0 -mx-6 mt-4 flex flex-col-reverse gap-2 border-t-[1.5px] border-white/12 bg-[rgba(22,22,25,0.95)] px-6 pb-6 pt-4 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
      <button
        type="button"
        onClick={() => onOpenChange(false)}
        className="text-xs font-medium text-white/60 hover:text-white/90 underline-offset-4 hover:underline"
      >
        Close without buying
      </button>
      <Button
        onClick={handleBuy}
        disabled={ctaBusy}
        className="h-11 rounded-md bg-orange-500 px-6 text-sm font-semibold text-white hover:bg-orange-500/90"
      >
        {ctaBusy ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>
            {ctaLabel ?? (recurring ? 'Continue to checkout' : 'Buy now')}
            <ArrowRight className="ml-1.5 h-4 w-4" />
          </>
        )}
      </Button>
    </div>
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          className="max-h-[92dvh] overflow-y-auto rounded-t-[20px] border-t-[1.5px] border-white/12 bg-[rgba(22,22,25,0.98)] p-6 backdrop-blur-xl"
        >
          <SheetTitle className="sr-only">{product.name}</SheetTitle>
          <SheetDescription className="sr-only">
            {entry?.promise ?? product.description ?? product.name}
          </SheetDescription>
          {Body}
          {Footer}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'max-w-2xl overflow-hidden rounded-[20px] border-[1.5px] border-white/12 bg-[rgba(22,22,25,0.98)] p-0 backdrop-blur-xl',
        )}
      >
        <DialogTitle className="sr-only">{product.name}</DialogTitle>
        <DialogDescription className="sr-only">
          {entry?.promise ?? product.description ?? product.name}
        </DialogDescription>
        <div className="max-h-[85vh] overflow-y-auto p-6">
          {Body}
          {Footer}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function deriveOutcomes(product: MonetizationProduct): { icon: React.ComponentType<{ className?: string }>; title: string; body: string }[] {
  // Fallback: turn the product's feature bullets into outcomes.
  return (product.features ?? []).slice(0, 6).map((f) => ({
    icon: Check,
    title: f,
    body: 'Included with this plan.',
  }));
}

/**
 * useLearnMoreDeepLink — pair this with the overlay on any surface that
 * shows a product. When the URL contains `?learn=<slug>` (or an alias)
 * that matches this product's slug, the overlay auto-opens. Removing the
 * param when it closes keeps the URL clean.
 */
export function useLearnMoreDeepLink(productSlug: string): {
  open: boolean;
  setOpen: (v: boolean) => void;
} {
  const [params, setParams] = useSearchParams();
  const requested = params.get('learn');
  const matched = !!requested && resolveLearnMoreSlug(requested) === productSlug;
  const [open, setOpenState] = React.useState(matched);

  React.useEffect(() => {
    if (matched) setOpenState(true);
  }, [matched]);

  const setOpen = (v: boolean) => {
    setOpenState(v);
    if (!v && matched) {
      const next = new URLSearchParams(params);
      next.delete('learn');
      setParams(next, { replace: true });
    }
  };

  return { open, setOpen };
}

export default ProductLearnMoreOverlay;
