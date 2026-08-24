import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Loader2,
  CheckCircle2,
  Stamp,
  AlertCircle as AlertCircleIcon,
  ExternalLink,
  Share2,
  Wrench,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import VerifiedSellerCTA from '@/components/verification/VerifiedSellerCTA';
import { ShareKit, ShareKitListing } from '@/components/listing-wizard/ShareKit';
import { ListingCategory, ListingMode } from '@/types/listing';
import { useToast } from '@/hooks/use-toast';
import { PromoteListingPanel } from '@/components/monetization/PromoteListingPanel';
import FeatureThisListingCTA from '@/components/dashboard/FeatureThisListingCTA';
import { reportError } from '@/lib/errorReporter';
import ListingReadinessCard from '@/components/listing/ListingReadinessCard';
import ReadinessDisclaimer from '@/components/listing/ReadinessDisclaimer';
import { publishListingIdempotent } from '@/lib/listings/publishListing';
import { authPath } from '@/lib/auth/returnTo';
import socialBubbleAsset from '@/assets/social-bubble.webm.asset.json';

const ListingPublished: React.FC = () => {
  const [searchParams] = useSearchParams();
  const listingIdFromParams = useParams<{ listingId: string }>().listingId;
  const listingId = listingIdFromParams || searchParams.get('listing_id');
  const notaryPaid = searchParams.get('notary_paid') === 'true';
  const featuredPaid = searchParams.get('featured_paid') === 'true';
  const featuredCancelled = searchParams.get('featured_cancelled') === 'true';

  const { toast } = useToast();
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();

  const [listing, setListing] = useState<ShareKitListing | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [featuredSyncing, setFeaturedSyncing] = useState(featuredPaid);
  const [featuredActive, setFeaturedActive] = useState(false);
  const [isPublished, setIsPublished] = useState(false);
  const [showShare, setShowShare] = useState(false);

  useEffect(() => {
    if (notaryPaid) {
      toast({
        title: 'Notary fee paid',
        description: 'Your $45 Proof Notary add-on has been activated. Your listing is live.',
      });
      try {
        const channel = new BroadcastChannel('notary-checkout');
        channel.postMessage({
          type: 'notary-checkout-complete',
          listingId,
          url: window.location.href,
        });
        channel.close();
      } catch {
        /* BroadcastChannel unsupported */
      }
    }
  }, [notaryPaid, listingId, toast]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate(authPath());
      return;
    }
    if (!listingId) {
      navigate('/dashboard');
      return;
    }

    const fetchListing = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('listings')
          .select('*')
          .eq('id', listingId)
          .single();

        if (fetchError) throw fetchError;
        if (!data) {
          setError('Listing not found');
          return;
        }
        if (data.host_id !== user?.id) {
          setError('You do not have access to this listing');
          return;
        }

        // Returning from a paid add-on while the draft never flipped live:
        // publish idempotently so a payment return can never create a second
        // listing or a duplicate first-publish notification.
        if (featuredPaid && data.status !== 'published') {
          try {
            const result = await publishListingIdempotent(listingId);
            data.status = 'published';
            data.published_at = result.publishedAt;
          } catch {
            /* moderation hold or transient error — leave status untouched */
          }
        }

        setIsPublished(data.status === 'published');
        setListing({
          id: data.id,
          title: data.title,
          coverImageUrl: data.cover_image_url,
          category: data.category as ListingCategory,
          mode: data.mode as ListingMode,
          address: data.address,
          priceDaily: data.price_daily,
          priceWeekly: data.price_weekly,
          priceSale: data.price_sale,
          highlights: data.highlights || [],
          availableFrom: data.available_from,
          availableTo: data.available_to,
        });
        if ((data as { featured_enabled?: boolean }).featured_enabled) {
          setFeaturedActive(true);
          setFeaturedSyncing(false);
        }
      } catch (err) {
        console.error('Error fetching listing:', err);
        setError('Failed to load listing');
      } finally {
        setIsLoading(false);
      }
    };

    if (user) fetchListing();
  }, [listingId, user, authLoading, navigate, featuredPaid]);

  // Poll for featured activation after returning from PayPal (webhook may lag).
  const [featuredWebhookStuck, setFeaturedWebhookStuck] = useState(false);
  const [featuredStuckRef, setFeaturedStuckRef] = useState<string | null>(null);
  useEffect(() => {
    if (!featuredPaid || featuredActive || !listingId || !user?.id) return;
    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 15; // ~30s
    const tick = async () => {
      if (cancelled) return;
      attempts++;
      const { data } = await supabase
        .from('listings')
        .select('featured_enabled, featured_expires_at, status')
        .eq('id', listingId)
        .maybeSingle();
      if (cancelled) return;
      if (data?.featured_enabled) {
        setFeaturedActive(true);
        setFeaturedSyncing(false);
        setIsPublished(data.status === 'published');
        toast({
          title: 'Featured boost activated',
          description: 'Your listing is featured for 30 days.',
        });
        return;
      }
      if (attempts >= maxAttempts) {
        setFeaturedSyncing(false);
        const { referenceCode } = await reportError({
          action: 'boost.webhook.timeout',
          endpoint: '/functions/v1/paypal-webhook',
          errorType: 'FeaturedActivationTimeout',
          errorMessage: 'featured_enabled did not become true within 30s after PayPal redirect',
          listingId,
          metadata: { pollAttempts: attempts },
        });
        setFeaturedStuckRef(referenceCode);
        setFeaturedWebhookStuck(true);
        toast({
          title: 'Payment received, activation delayed',
          description: `PayPal confirmed your payment but your boost hasn't activated yet. Our team was notified — no need to pay again. Reference: ${referenceCode}`,
          variant: 'destructive',
        });
        return;
      }
      setTimeout(tick, 2000);
    };
    tick();
    return () => {
      cancelled = true;
    };
  }, [featuredPaid, featuredActive, listingId, user?.id, toast]);

  if (authLoading || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
        <p className="mb-4 text-muted-foreground">{error}</p>
        <button onClick={() => navigate('/dashboard')} className="text-primary hover:underline">
          Go to dashboard
        </button>
      </div>
    );
  }

  if (!listing || !listingId) return null;

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card">
        <div className="container mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Dashboard
          </button>
          {isPublished && (
            <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs text-emerald-500">
              Live
            </span>
          )}
        </div>
      </div>

      {notaryPaid && (
        <div className="border-b border-emerald-500/30 bg-emerald-500/10">
          <div className="container mx-auto flex max-w-3xl items-center gap-3 px-4 py-4">
            <Stamp className="h-5 w-5 text-emerald-500" />
            <p className="text-sm text-foreground">
              <strong>Proof Notary add-on activated.</strong> Both parties receive notarization
              links when the sale completes.
            </p>
            <CheckCircle2 className="ml-auto h-5 w-5 text-emerald-500" />
          </div>
        </div>
      )}

      {featuredCancelled && (
        <div className="border-b border-border bg-muted/40">
          <div className="container mx-auto max-w-3xl px-4 py-4">
            <p className="text-sm text-foreground">
              <strong>Your listing is live.</strong> The Featured boost wasn't purchased — you can
              add it anytime from your dashboard.
            </p>
          </div>
        </div>
      )}

      {featuredPaid && (
        <div
          className={`border-b ${
            featuredWebhookStuck ? 'border-red-500/30 bg-red-500/10' : 'border-border bg-muted/40'
          }`}
        >
          <div className="container mx-auto flex max-w-3xl items-start gap-3 px-4 py-4">
            {featuredSyncing ? (
              <Loader2 className="mt-0.5 h-5 w-5 animate-spin text-muted-foreground" />
            ) : featuredWebhookStuck ? (
              <AlertCircleIcon className="mt-0.5 h-5 w-5 text-red-500" />
            ) : (
              <CheckCircle2 className="mt-0.5 h-5 w-5 text-amber-500" />
            )}
            <div className="flex-1">
              <p className="font-medium">
                {featuredActive
                  ? 'Featured boost activated'
                  : featuredWebhookStuck
                    ? 'Payment received — activation delayed'
                    : 'Finalizing your featured boost'}
              </p>
              <p className="text-sm text-muted-foreground">
                {featuredActive
                  ? 'Your listing is featured at the top of search for 30 days.'
                  : featuredWebhookStuck
                    ? "PayPal confirmed your payment, but your boost hasn't activated yet. You haven't been charged twice — our team was notified."
                    : 'Your payment went through. The boost appears within a minute.'}
              </p>
              {featuredWebhookStuck && (
                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
                  {featuredStuckRef && (
                    <span className="rounded bg-red-500/15 px-2 py-0.5 font-mono text-red-400">
                      Reference: {featuredStuckRef}
                    </span>
                  )}
                  <a href="tel:+17257559598" className="underline">
                    Call (725) 755-9598
                  </a>
                  <a
                    href={`mailto:support@vendibook.com?subject=Featured%20boost%20not%20active%20${
                      featuredStuckRef ?? ''
                    }&body=Listing%20ID%3A%20${listingId}`}
                    className="underline"
                  >
                    Email support
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="container mx-auto max-w-3xl space-y-8 px-4 py-10">
        {/* Success */}
        <header className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-emerald-500">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <video
              src={socialBubbleAsset.url}
              autoPlay
              loop
              muted
              playsInline
              aria-hidden="true"
              className="h-10 w-auto rounded-lg"
            />
          </div>
          <h1 className="text-3xl font-semibold text-foreground">Your listing is live</h1>
          <p className="text-muted-foreground">
            Buyers can now discover and contact you about your listing. Add more equipment and
            operating details to help the right buyers understand exactly what you're offering.
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            <Button onClick={() => navigate(`/listing/${listingId}`)}>
              <ExternalLink className="mr-2 h-4 w-4" />
              View my listing
            </Button>
            <Button variant="outline" onClick={() => navigate(`/listings/${listingId}/improve`)}>
              <Wrench className="mr-2 h-4 w-4" />
              Improve my listing
            </Button>
            <Button variant="outline" onClick={() => setShowShare((s) => !s)}>
              <Share2 className="mr-2 h-4 w-4" />
              Share listing
            </Button>
          </div>
          <button
            onClick={() => navigate('/dashboard')}
            className="text-sm text-muted-foreground underline-offset-4 hover:underline"
          >
            Return to dashboard
          </button>
        </header>

        {showShare && <ShareKit listing={listing} onClose={() => setShowShare(false)} />}

        {/* Optional trust upsell — secondary to the core success actions. */}
        <VerifiedSellerCTA variant="success" />


        {/* Buyer readiness */}
        <section className="rounded-xl border border-border/60 bg-card/60 p-5">
          <h2 className="text-lg font-semibold text-foreground">
            Help the right buyer understand your equipment
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Your listing is live with the essential information. Add equipment, utility, inspection,
            and operating details to answer common buyer questions and make your listing easier to
            evaluate.
          </p>
          <Button className="mt-4" onClick={() => navigate(`/listings/${listingId}/improve`)}>
            Improve my listing
          </Button>
          <ReadinessDisclaimer className="mt-4" />
        </section>

        <ListingReadinessCard
          listingId={listingId}
          category={listing.category}
          mode={listing.mode}
        />

        {/* Optional products, kept separate from publishing success. */}
        <section className="space-y-6 border-t border-border/60 pt-8">
          <p className="text-sm text-muted-foreground">
            Optional extras — publishing is always free.
          </p>
          {isPublished && !featuredActive && !featuredPaid && (
            <FeatureThisListingCTA listingId={listingId} />
          )}
          <PromoteListingPanel listingId={listingId} />
        </section>
      </div>
    </div>
  );
};

export default ListingPublished;
