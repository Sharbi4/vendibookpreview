import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Loader2, CheckCircle2, Stamp } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { ShareKit, ShareKitListing } from '@/components/listing-wizard/ShareKit';
import { ListingCategory, ListingMode } from '@/types/listing';
import { useToast } from '@/hooks/use-toast';
import BoostListingPrompt from '@/components/dashboard/BoostListingPrompt';
import PublishStatusSummary from '@/components/listing-wizard/PublishStatusSummary';
import { reportError } from '@/lib/errorReporter';

const ListingPublished: React.FC = () => {
  const [searchParams] = useSearchParams();
  const listingIdFromParams = useParams<{ listingId: string }>().listingId;
  // Support both route param and query param for listing_id
  const listingId = listingIdFromParams || searchParams.get('listing_id');
  const notaryPaid = searchParams.get('notary_paid') === 'true';
  const featuredPaid = searchParams.get('featured_paid') === 'true';
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  
  const [listing, setListing] = useState<ShareKitListing | null>(null);
  const [boostCandidate, setBoostCandidate] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [featuredSyncing, setFeaturedSyncing] = useState(featuredPaid);
  const [featuredActive, setFeaturedActive] = useState(false);
  const [isPublished, setIsPublished] = useState(false);

  useEffect(() => {
    // Show toast for notary payment success
    if (notaryPaid) {
      toast({
        title: "Notary Fee Paid",
        description: "Your $45 Proof Notary add-on has been activated. Your listing is now live!",
      });
      
      // Broadcast to other tabs that notary checkout is complete
      // This allows the original wizard tab to navigate to this page
      try {
        const channel = new BroadcastChannel('notary-checkout');
        channel.postMessage({
          type: 'notary-checkout-complete',
          listingId: listingId,
          url: window.location.href,
        });
        channel.close();
      } catch (e) {
        // BroadcastChannel not supported in some browsers, silently fail
        console.log('BroadcastChannel not supported');
      }
    }
  }, [notaryPaid, listingId, toast]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
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

        // Check ownership
        if (data.host_id !== user?.id) {
          setError('You do not have access to this listing');
          return;
        }

        // If returning from Stripe boost and listing is still a draft, self-heal: publish it.
        if (featuredPaid && data.status !== 'published') {
          const nowIso = new Date().toISOString();
          const { error: pubErr } = await supabase
            .from('listings')
            .update({ status: 'published', published_at: data.published_at ?? nowIso })
            .eq('id', listingId);
          if (!pubErr) {
            data.status = 'published';
            data.published_at = data.published_at ?? nowIso;
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
        setBoostCandidate({
          id: data.id,
          title: data.title,
          status: data.status,
          featured_enabled: (data as any).featured_enabled,
          featured_expires_at: (data as any).featured_expires_at,
        });
        if ((data as any).featured_enabled) {
          setFeaturedActive(true);
          setFeaturedSyncing(false);
        }
        // Always offer boost right after a fresh publish — clear any prior suppression
        if (user?.id) {
          try { localStorage.removeItem(`vendi_boost_prompt_dismissed_${user.id}`); } catch {}
        }
      } catch (err) {
        console.error('Error fetching listing:', err);
        setError('Failed to load listing');
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      fetchListing();
    }
  }, [listingId, user, authLoading, navigate, featuredPaid]);

  // Poll for featured activation after returning from Stripe (webhook may lag)
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
          title: 'Featured Boost Activated ⭐',
          description: 'Your listing is now featured for 30 days.',
        });
        return;
      }
      if (attempts >= maxAttempts) {
        setFeaturedSyncing(false);
        // Webhook didn't update within 30s — surface actionable error state.
        const { referenceCode } = await reportError({
          action: 'boost.webhook.timeout',
          endpoint: '/functions/v1/stripe-webhook',
          errorType: 'FeaturedActivationTimeout',
          errorMessage: 'featured_enabled did not become true within 30s after Stripe redirect',
          listingId,
          metadata: { pollAttempts: attempts },
        });
        setFeaturedStuckRef(referenceCode);
        setFeaturedWebhookStuck(true);
        toast({
          title: "Payment received, activation delayed",
          description: `Stripe confirmed your payment but your boost hasn't activated yet. Our team was notified — no need to pay again. Reference: ${referenceCode}`,
          variant: 'destructive',
        });
        return;
      }
      setTimeout(tick, 2000);
    };
    tick();
    return () => { cancelled = true; };
  }, [featuredPaid, featuredActive, listingId, user?.id, toast]);


  const handleClose = () => {
    navigate('/dashboard');
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
        <p className="text-muted-foreground mb-4">{error}</p>
        <button
          onClick={() => navigate('/dashboard')}
          className="text-primary hover:underline"
        >
          Go to dashboard
        </button>
      </div>
    );
  }

  if (!listing) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Minimal Header */}
      <div className="border-b bg-card">
        <div className="container max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Dashboard
            </button>
            <h1 className="font-semibold">Share your listing</h1>
            <div className="w-16" />
          </div>
        </div>
      </div>

      {/* Notary Payment Success Banner */}
      {notaryPaid && (
        <div className="bg-emerald-50 dark:bg-emerald-950/30 border-b border-emerald-200 dark:border-emerald-800">
          <div className="container max-w-2xl mx-auto px-4 py-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-emerald-100 dark:bg-emerald-900">
                <Stamp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="font-medium text-emerald-800 dark:text-emerald-200">
                  Proof Notary Add-On Activated
                </p>
                <p className="text-sm text-emerald-600 dark:text-emerald-400">
                  Your $45 notary fee has been charged. Both parties will receive notarization links when the sale completes.
                </p>
              </div>
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 ml-auto" />
            </div>
          </div>
        </div>
      )}

      {/* Featured Boost Success / Syncing Banner */}
      {featuredPaid && (
        <div className={`border-b ${featuredActive ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800' : 'bg-muted/40 border-border'}`}>
          <div className="container max-w-2xl mx-auto px-4 py-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full ${featuredActive ? 'bg-amber-100 dark:bg-amber-900' : 'bg-muted'}`}>
                {featuredSyncing ? (
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                ) : (
                  <CheckCircle2 className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                )}
              </div>
              <div className="flex-1">
                <p className="font-medium">
                  {featuredActive
                    ? 'Featured Boost Activated ⭐'
                    : featuredSyncing
                      ? 'Finalizing your Featured Boost…'
                      : 'Payment received — boost will activate shortly'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {featuredActive
                    ? `Your listing is now published and featured at the top of search for 30 days.`
                    : 'Your payment was successful. Your listing is published and the boost will appear within a minute.'}
                </p>
              </div>
              {isPublished && (
                <span className="text-xs px-2 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 whitespace-nowrap">
                  Listing live
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Share Kit */}
      <div className="container max-w-2xl mx-auto px-4 py-12">
        {user?.id && listingId && (
          <PublishStatusSummary listingId={listingId} hostId={user.id} />
        )}
        <ShareKit listing={listing} onClose={handleClose} />
      </div>

      {/* Post-publish: offer 30-day boost */}
      {boostCandidate && (
        <BoostListingPrompt listings={[boostCandidate]} userId={user?.id} />
      )}
    </div>
  );
};

export default ListingPublished;
