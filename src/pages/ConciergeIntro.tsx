import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ClipboardList, Clock, MessageSquare, ShieldCheck } from 'lucide-react';
import Header from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import SEO from '@/components/SEO';
import FieldHelp from '@/components/common/FieldHelp';
import VisibilityLabel from '@/components/common/VisibilityLabel';
import { trackEvent } from '@/lib/analytics';
import { LISTING_ROUTES } from '@/lib/listings/routes';
import { CONCIERGE_BENEFITS, LISTING_CONCIERGE } from '@/config/listingConcierge';
import ConciergePurchasePanel from '@/components/concierge/ConciergePurchasePanel';

/**
 * Concierge introduction / intake placeholder.
 *
 * Phase 1 deliberately collects no payment and creates no orders. It exists so
 * the gateway CTA has a stable, honest destination.
 */
const ConciergeIntro: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    trackEvent({ category: 'Supply', action: 'concierge_intro_viewed' });
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="VendiBook Listing Concierge — Done-for-you listings"
        description="Send us your equipment information and photos. We turn them into a polished, buyer-ready VendiBook listing for your approval."
        canonical={LISTING_CONCIERGE.introPath}
      />
      <Header />
      <main className="mx-auto max-w-3xl px-4 pb-20 pt-24 sm:pt-28">
        <Button
          variant="ghost"
          onClick={() => navigate(LISTING_ROUTES.gateway)}
          className="mb-6 pl-0 transition-all hover:pl-2"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to listing options
        </Button>

        <Badge variant="secondary" className="mb-4">
          Done for you
        </Badge>
        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          {LISTING_CONCIERGE.name}
        </h1>
        <p className="mt-2 text-lg font-semibold text-foreground">
          {LISTING_CONCIERGE.priceLabel}
        </p>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground">
          Send us your equipment information and photos. We’ll transform everything into a
          polished, buyer-ready listing for your approval.
        </p>

        <div className="mt-8 rounded-2xl border border-border/60 bg-card/60 p-6 backdrop-blur-sm">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <ClipboardList className="h-5 w-5" aria-hidden="true" />
            What’s included
          </h2>
          <ul className="mt-4 grid gap-2.5 sm:grid-cols-2">
            {CONCIERGE_BENEFITS.map((benefit) => (
              <li key={benefit} className="flex items-start gap-2 text-sm text-foreground/90">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                <span>{benefit}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-border/60 p-5">
            <p className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Clock className="h-4 w-4" aria-hidden="true" />
              Typical turnaround
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {LISTING_CONCIERGE.turnaroundBusinessDays} business days after we receive your
              information and photos.
            </p>
          </div>
          <div className="rounded-xl border border-border/60 p-5">
            <p className="flex items-center gap-2 text-sm font-medium text-foreground">
              <MessageSquare className="h-4 w-4" aria-hidden="true" />
              Revisions
              <FieldHelp label="included revisions">
                A revision is one round of changes to the drafted listing before you approve it —
                wording, ordering, specifications, or pricing presentation.
              </FieldHelp>
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {LISTING_CONCIERGE.includedRevisions} included revision. Nothing publishes until you
              approve it.
            </p>
          </div>
        </div>

        <div className="mt-8 space-y-4">
          <ConciergePurchasePanel />
          <Button variant="outline" onClick={() => navigate(LISTING_ROUTES.quickStart)}>
            Create my free listing instead
          </Button>
        </div>


        <div className="mt-8 space-y-3">
          <VisibilityLabel kind="private" />
          <p className="text-xs leading-relaxed text-muted-foreground">
            {LISTING_CONCIERGE.noGuaranteeCopy}
          </p>
          <p className="text-xs text-muted-foreground">
            <Link to={LISTING_CONCIERGE.termsPath} className="underline underline-offset-2">
              Concierge Service Terms
            </Link>{' '}
            — published before purchase opens.
          </p>
        </div>
      </main>
    </div>
  );
};

export default ConciergeIntro;
