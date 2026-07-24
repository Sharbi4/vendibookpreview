import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { z } from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import { startMonetizationCheckout } from '@/lib/monetization/products';

const schema = z.object({
  budget: z.string().trim().max(80).optional(),
  business_type: z.string().trim().max(120).optional(),
  city: z.string().trim().max(120).optional(),
  state: z.string().trim().max(60).optional(),
  financing_needs: z.string().trim().max(400).optional(),
  primary_concerns: z.string().trim().max(1000).optional(),
  purchase_timeline: z.string().trim().max(120).optional(),
});

/**
 * Intake form for the $149 Listing Purchase Review.
 * Flow: capture intake → create pending buyer_service_request →
 * open Stripe checkout via create-monetization-checkout.
 */
const ListingPurchaseReviewIntake = () => {
  const { listingId } = useParams<{ listingId: string }>();
  const nav = useNavigate();
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [listingTitle, setListingTitle] = useState('');
  const [form, setForm] = useState({
    budget: '',
    business_type: '',
    city: '',
    state: '',
    financing_needs: '',
    primary_concerns: '',
    purchase_timeline: '',
  });

  useEffect(() => {
    if (!listingId) return;
    (async () => {
      const { data } = await supabase
        .from('listings')
        .select('title,city,state')
        .eq('id', listingId)
        .maybeSingle();
      if (data) {
        setListingTitle(data.title ?? '');
        setForm((s) => ({
          ...s,
          city: s.city || (data as { city?: string }).city || '',
          state: s.state || (data as { state?: string }).state || '',
        }));
      }
    })();
  }, [listingId]);

  const update = (k: keyof typeof form, v: string) => setForm((s) => ({ ...s, [k]: v }));

  const handleSubmit = async () => {
    if (!user) {
      toast.error('Please sign in to request a review.');
      nav(`/auth?redirect=/buyer/services/review/${listingId ?? ''}`);
      return;
    }
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? 'Please review the form.');
      return;
    }
    try {
      setBusy(true);
      // Save the intake as a pending request first — webhook attaches purchase_id after payment.
      await (supabase as unknown as {
        from: (t: string) => {
          insert: (r: unknown) => Promise<{ error: Error | null }>;
        };
      })
        .from('buyer_service_requests')
        .insert({
          buyer_id: user.id,
          listing_id: listingId ?? null,
          product_key: 'listing_purchase_review',
          status: 'awaiting_payment',
          intake: parsed.data,
        });

      const { buildCheckoutReturnPaths } = await import('@/lib/monetization/returnRoutes');
      const paths = buildCheckoutReturnPaths('listing-purchase-review', { listingId });
      const { url } = await startMonetizationCheckout({
        productSlug: 'listing_purchase_review',
        listingId,
        successPath: paths.successPath,
        cancelPath: paths.cancelPath,
      });
      window.location.href = url;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not start checkout.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <section className="mx-auto max-w-2xl px-4 py-14">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Listing Purchase Review — $149
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-foreground">
          Tell us about your purchase{listingTitle ? `: ${listingTitle}` : ''}
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          A Vendibook reviewer will read the listing, compare comps, and send you a written
          review with price observations, red flags, questions to ask, and next steps. Typically
          delivered within 5 business days. This is informational only and is not a certified
          inspection, appraisal, or legal opinion.
        </p>

        <div className="mt-8 space-y-4">
          <div>
            <Label htmlFor="budget">Your budget</Label>
            <Input id="budget" value={form.budget} onChange={(e) => update('budget', e.target.value)} />
          </div>
          <div>
            <Label htmlFor="business_type">Planned business type</Label>
            <Input id="business_type" placeholder="Taco truck, mobile bakery, catering…" value={form.business_type} onChange={(e) => update('business_type', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="city">City</Label>
              <Input id="city" value={form.city} onChange={(e) => update('city', e.target.value)} />
            </div>
            <div>
              <Label htmlFor="state">State</Label>
              <Input id="state" value={form.state} onChange={(e) => update('state', e.target.value)} />
            </div>
          </div>
          <div>
            <Label htmlFor="financing_needs">Financing needs</Label>
            <Input id="financing_needs" placeholder="Cash, SBA loan, working capital…" value={form.financing_needs} onChange={(e) => update('financing_needs', e.target.value)} />
          </div>
          <div>
            <Label htmlFor="primary_concerns">Primary concerns</Label>
            <Textarea id="primary_concerns" rows={4} value={form.primary_concerns} onChange={(e) => update('primary_concerns', e.target.value)} />
          </div>
          <div>
            <Label htmlFor="purchase_timeline">Intended purchase timeline</Label>
            <Input id="purchase_timeline" placeholder="Within 30 / 60 / 90 days" value={form.purchase_timeline} onChange={(e) => update('purchase_timeline', e.target.value)} />
          </div>

          <Button onClick={handleSubmit} disabled={busy} className="w-full">
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Continue to secure checkout — $149
          </Button>
          <p className="text-xs text-muted-foreground">
            You will be redirected to Stripe. No charge until you confirm.
          </p>
        </div>
      </section>
    </div>
  );
};

export default ListingPurchaseReviewIntake;
