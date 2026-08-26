import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CalendarDays,
  DollarSign,
  Truck,
  Loader2,
  Pencil,
  ShieldCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Tables } from '@/integrations/supabase/types';
import {
  createLinkedRentalDraft,
  isRentalConversionEligible,
} from '@/lib/listings/rentalConversion';
import { DOCUMENT_TYPE_LABELS, type DocumentType } from '@/types/documents';
import { validateRentalRates } from '@/lib/listings/rentalPricing';

type Listing = Tables<'listings'>;

const STEPS = ['Rental pricing', 'Availability & booking', 'Terms & fulfillment', 'Review'] as const;

const DOC_OPTIONS: DocumentType[] = [
  'drivers_license',
  'commercial_liability_insurance',
  'vehicle_insurance',
  'food_handler_certificate',
  'business_license',
];

const numberOrNull = (value: string): number | null => {
  const n = Number(value);
  return value.trim() === '' || Number.isNaN(n) || n <= 0 ? null : n;
};

const money = (n: number | null | undefined) =>
  n ? `$${Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}` : '—';

const RentItOut: React.FC = () => {
  const { listingId } = useParams<{ listingId: string }>();
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<Listing | null>(null);
  const [rental, setRental] = useState<Listing | null>(null);
  const [step, setStep] = useState(-1); // -1 = intro
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);

  // Step 1
  const [priceDaily, setPriceDaily] = useState('');
  const [priceWeekly, setPriceWeekly] = useState('');
  const [priceMonthly, setPriceMonthly] = useState('');
  const [deposit, setDeposit] = useState('');
  const [minDays, setMinDays] = useState('1');
  // Step 2
  const [availableFrom, setAvailableFrom] = useState('');
  const [availableTo, setAvailableTo] = useState('');
  const [instantBook, setInstantBook] = useState(false);
  // Step 3
  const [fulfillment, setFulfillment] = useState<'pickup' | 'delivery' | 'both'>('pickup');
  const [deliveryRadius, setDeliveryRadius] = useState('');
  const [deliveryFee, setDeliveryFee] = useState('');
  const [pickupInstructions, setPickupInstructions] = useState('');
  const [requiredDocs, setRequiredDocs] = useState<DocumentType[]>([]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate(`/auth?redirect=${encodeURIComponent(`/listings/${listingId}/rent-it-out`)}`);
      return;
    }
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);
      const { data: src, error: srcErr } = await supabase
        .from('listings')
        .select('*')
        .eq('id', listingId!)
        .maybeSingle();

      if (cancelled) return;
      if (srcErr || !src) {
        setError('We could not load this listing.');
        setLoading(false);
        return;
      }
      if (src.host_id !== user.id) {
        setError('You can only rent out your own listing.');
        setLoading(false);
        return;
      }
      if (!isRentalConversionEligible(src)) {
        setError('Only published or paused food trucks and trailers listed for sale can be rented out.');
        setLoading(false);
        return;
      }
      setSource(src);

      const created = await createLinkedRentalDraft(src.id);
      if (cancelled) return;
      if ('error' in created) {
        setError(created.error);
        setLoading(false);
        return;
      }

      const { data: r } = await supabase
        .from('listings')
        .select('*')
        .eq('id', created.rentalId)
        .maybeSingle();
      if (cancelled) return;

      if (r) {
        setRental(r);
        setPriceDaily(r.price_daily ? String(r.price_daily) : '');
        setPriceWeekly(r.price_weekly ? String(r.price_weekly) : '');
        setPriceMonthly(r.price_monthly ? String(r.price_monthly) : '');
        setDeposit(r.deposit_amount ? String(r.deposit_amount) : '');
        setMinDays(r.rental_min_days ? String(r.rental_min_days) : '1');
        setAvailableFrom(r.available_from ? String(r.available_from).slice(0, 10) : '');
        setAvailableTo(r.available_to ? String(r.available_to).slice(0, 10) : '');
        setInstantBook(Boolean(r.instant_book));
        setFulfillment(
          r.fulfillment_type === 'delivery' || r.fulfillment_type === 'both'
            ? (r.fulfillment_type as 'delivery' | 'both')
            : 'pickup',
        );
        setDeliveryRadius(r.delivery_radius_miles ? String(r.delivery_radius_miles) : '');
        setDeliveryFee(r.delivery_fee ? String(r.delivery_fee) : '');
        setPickupInstructions(r.pickup_instructions ?? '');

        const { data: docs } = await supabase
          .from('listing_required_documents')
          .select('document_type')
          .eq('listing_id', r.id);
        if (!cancelled && docs) {
          setRequiredDocs(docs.map((d) => d.document_type as DocumentType));
        }
      }
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [listingId, user, authLoading, navigate]);

  const copiedSummary = useMemo(() => {
    if (!source) return [];
    return [
      { label: 'Photos', value: `${source.image_urls?.length ?? 0} copied`, done: (source.image_urls?.length ?? 0) > 0 },
      { label: 'Title & description', value: 'Copied', done: Boolean(source.description) },
      { label: 'Equipment & highlights', value: `${(source.amenities?.length ?? 0) + (source.highlights?.length ?? 0)} items`, done: true },
      { label: 'Location', value: [source.city, source.state].filter(Boolean).join(', ') || 'Copied', done: Boolean(source.city) },
      { label: 'Specs & dimensions', value: 'Copied', done: true },
    ];
  }, [source]);

  const rateValidation = useMemo(
    () =>
      validateRentalRates({
        price_daily: priceDaily,
        price_weekly: priceWeekly,
        price_monthly: priceMonthly,
      }),
    [priceDaily, priceWeekly, priceMonthly],
  );
  const pricingValid = rateValidation.valid;
  const pricingError =
    rateValidation.errors.root ??
    rateValidation.errors.daily ??
    rateValidation.errors.weekly ??
    rateValidation.errors.monthly ??
    null;

  const persist = async (extra?: Record<string, unknown>) => {
    if (!rental) return false;
    setSaving(true);
    const payload = {
      price_daily: rateValidation.values.daily,
      price_weekly: rateValidation.values.weekly,
      price_monthly: rateValidation.values.monthly,
      deposit_amount: numberOrNull(deposit),
      rental_min_days: numberOrNull(minDays) ?? 1,
      available_from: availableFrom || null,
      available_to: availableTo || null,
      instant_book: instantBook,
      fulfillment_type: fulfillment,
      delivery_radius_miles: fulfillment === 'pickup' ? null : numberOrNull(deliveryRadius),
      delivery_fee: fulfillment === 'pickup' ? null : numberOrNull(deliveryFee),
      pickup_instructions: pickupInstructions || null,
      ...extra,
    };
    const { error: updErr } = await supabase.from('listings').update(payload).eq('id', rental.id);
    setSaving(false);
    if (updErr) {
      toast({ title: 'Could not save', description: updErr.message, variant: 'destructive' });
      return false;
    }
    return true;
  };

  const syncDocs = async () => {
    if (!rental) return;
    await supabase.from('listing_required_documents').delete().eq('listing_id', rental.id);
    if (requiredDocs.length) {
      await supabase.from('listing_required_documents').insert(
        requiredDocs.map((document_type) => ({
          listing_id: rental.id,
          document_type,
          is_required: true,
          deadline_type: 'before_approval' as const,
        })),
      );
    }
  };

  const goNext = async () => {
    if (step === 0 && !pricingValid) {
      toast({
        title: 'Check your rental pricing',
        description: pricingError ?? 'Enter at least one rate to continue.',
        variant: 'destructive',
      });
      return;
    }
    const saved = await persist();
    if (!saved) return;
    if (step === 2) await syncDocs();
    setStep((s) => Math.min(s + 1, 3));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const publish = async () => {
    if (!rental) return;
    setPublishing(true);
    const saved = await persist();
    if (!saved) {
      setPublishing(false);
      return;
    }
    await syncDocs();
    const { error: pubErr } = await supabase
      .from('listings')
      .update({ status: 'published', published_at: new Date().toISOString() })
      .eq('id', rental.id);
    setPublishing(false);
    if (pubErr) {
      toast({
        title: 'Publish failed',
        description: pubErr.message.includes('publish_incomplete')
          ? 'Some listing details are still missing. Use “Edit asset details” to complete them.'
          : pubErr.message,
        variant: 'destructive',
      });
      return;
    }
    toast({ title: 'Your rental is live', description: 'Renters can now book this truck.' });
    navigate(`/listing/${rental.id}`);
  };

  if (loading || authLoading) {
    return (
      <div className="sale-light min-h-screen bg-[#FBF8F3] px-4 py-12">
        <div className="mx-auto max-w-3xl space-y-6">
          <Skeleton className="h-10 w-2/3" />
          <Skeleton className="h-56 w-full rounded-3xl" />
          <Skeleton className="h-40 w-full rounded-3xl" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="sale-light min-h-screen bg-[#FBF8F3] px-4 py-20">
        <div className="mx-auto max-w-md rounded-3xl border border-black/10 bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-semibold text-foreground">Rental setup unavailable</h1>
          <p className="mt-3 text-sm text-muted-foreground">{error}</p>
          <Button className="mt-6" onClick={() => navigate('/dashboard')}>Back to dashboard</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="sale-light min-h-screen bg-[#FBF8F3] pb-24">
      <div className="mx-auto max-w-3xl px-4 pt-8 sm:pt-12">
        <button
          onClick={() => (step <= -1 ? navigate('/dashboard') : setStep((s) => s - 1))}
          className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> {step <= -1 ? 'Back to dashboard' : 'Back'}
        </button>

        {step >= 0 && (
          <div className="mb-8 flex items-center gap-2">
            {STEPS.map((label, i) => (
              <div key={label} className="flex-1">
                <div
                  className={cn(
                    'h-1.5 rounded-full transition-colors',
                    i <= step ? 'bg-foreground' : 'bg-black/10',
                  )}
                />
                <p className={cn('mt-2 hidden text-xs sm:block', i === step ? 'text-foreground font-medium' : 'text-muted-foreground')}>
                  {label}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Intro */}
        {step === -1 && source && (
          <div className="overflow-hidden rounded-3xl border border-black/10 bg-white shadow-sm">
            {source.cover_image_url && (
              <img
                src={source.cover_image_url}
                alt={source.title ?? 'Your listing'}
                className="h-52 w-full object-cover"
                loading="lazy"
              />
            )}
            <div className="p-6 sm:p-9">
              <Badge className="mb-4 rounded-full bg-black/5 text-foreground hover:bg-black/5">
                Same truck, second income stream
              </Badge>
              <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                Rent out this truck too
              </h1>
              <p className="mt-3 text-base text-muted-foreground">
                We’ll use the photos, equipment, description and location from your sale listing.
                Just add your rental pricing, availability and rental terms.
              </p>

              <div className="mt-7 grid gap-3 sm:grid-cols-2">
                {copiedSummary.map((item) => (
                  <div key={item.label} className="flex items-start gap-3 rounded-2xl bg-[#FBF8F3] p-4">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-foreground text-white">
                      <Check className="h-3 w-3" />
                    </span>
                    <div>
                      <p className="text-sm font-medium text-foreground">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.value}</p>
                    </div>
                  </div>
                ))}
                <div className="flex items-start gap-3 rounded-2xl border border-dashed border-black/15 p-4 sm:col-span-2">
                  <DollarSign className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Still needed</p>
                    <p className="text-xs text-muted-foreground">
                      Rental pricing, availability and rental terms — about 2 minutes.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button size="lg" className="flex-1" onClick={() => setStep(0)}>
                  Set up my rental <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                {rental && (
                  <Button size="lg" variant="outline" asChild>
                    <Link to={`/create-listing/${rental.id}`}>
                      <Pencil className="mr-2 h-4 w-4" /> Edit asset details
                    </Link>
                  </Button>
                )}
              </div>
              <p className="mt-4 text-xs text-muted-foreground">
                Your sale listing stays live. Buyers and renters can both find this truck.
              </p>
            </div>
          </div>
        )}

        {/* Step 1 — Pricing */}
        {step === 0 && (
          <section className="rounded-3xl border border-black/10 bg-white p-6 shadow-sm sm:p-9">
            <h2 className="text-2xl font-semibold text-foreground">Rental pricing</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Set at least one rate. Longer terms usually book best for food trucks.
            </p>
            <div className="mt-6 space-y-5">
              <div className="space-y-2">
                <Label htmlFor="daily">Daily rate</Label>
                <Input id="daily" inputMode="decimal" value={priceDaily} onChange={(e) => setPriceDaily(e.target.value)} placeholder="450" className="text-base" />
              </div>
              <div className="rounded-2xl bg-[#FBF8F3] p-4">
                <Label htmlFor="monthly" className="text-base font-medium">Monthly rate</Label>
                <p className="mb-2 text-xs text-muted-foreground">Most operators book monthly — this drives your best bookings.</p>
                <Input id="monthly" inputMode="decimal" value={priceMonthly} onChange={(e) => setPriceMonthly(e.target.value)} placeholder="6,500" className="bg-white text-base" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="weekly">Weekly rate <span className="text-muted-foreground">(optional)</span></Label>
                  <Input id="weekly" inputMode="decimal" value={priceWeekly} onChange={(e) => setPriceWeekly(e.target.value)} placeholder="2,200" className="text-base" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="deposit">Security deposit <span className="text-muted-foreground">(optional)</span></Label>
                  <Input id="deposit" inputMode="decimal" value={deposit} onChange={(e) => setDeposit(e.target.value)} placeholder="1,000" className="text-base" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="mindays">Minimum rental length (days)</Label>
                <Input id="mindays" inputMode="numeric" value={minDays} onChange={(e) => setMinDays(e.target.value)} className="text-base" />
              </div>
            </div>
          </section>
        )}

        {/* Step 2 — Availability */}
        {step === 1 && (
          <section className="rounded-3xl border border-black/10 bg-white p-6 shadow-sm sm:p-9">
            <h2 className="text-2xl font-semibold text-foreground">Availability & booking</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Leave the dates blank if the truck is available now. You can block specific dates later from your dashboard calendar.
            </p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="from">Available from</Label>
                <Input id="from" type="date" value={availableFrom} onChange={(e) => setAvailableFrom(e.target.value)} className="text-base" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="to">Available until <span className="text-muted-foreground">(optional)</span></Label>
                <Input id="to" type="date" value={availableTo} onChange={(e) => setAvailableTo(e.target.value)} className="text-base" />
              </div>
            </div>
            <div className="mt-6 flex items-start justify-between gap-4 rounded-2xl bg-[#FBF8F3] p-5">
              <div>
                <p className="text-sm font-medium text-foreground">Instant Book</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Off by default — you review and approve every request first. Turn it on to let renters book instantly.
                </p>
              </div>
              <Switch checked={instantBook} onCheckedChange={setInstantBook} />
            </div>
          </section>
        )}

        {/* Step 3 — Terms */}
        {step === 2 && (
          <section className="rounded-3xl border border-black/10 bg-white p-6 shadow-sm sm:p-9">
            <h2 className="text-2xl font-semibold text-foreground">Rental terms & fulfillment</h2>
            <p className="mt-2 text-sm text-muted-foreground">Confirm how renters get the truck.</p>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {(['pickup', 'delivery', 'both'] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setFulfillment(option)}
                  className={cn(
                    'rounded-2xl border p-4 text-left transition-all',
                    fulfillment === option
                      ? 'border-foreground bg-foreground/5 shadow-sm'
                      : 'border-black/10 hover:border-black/25',
                  )}
                >
                  <Truck className="mb-2 h-4 w-4 text-muted-foreground" />
                  <p className="text-sm font-medium capitalize text-foreground">{option}</p>
                </button>
              ))}
            </div>

            {fulfillment !== 'pickup' && (
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="radius">Delivery radius (miles)</Label>
                  <Input id="radius" inputMode="numeric" value={deliveryRadius} onChange={(e) => setDeliveryRadius(e.target.value)} className="text-base" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fee">Delivery fee</Label>
                  <Input id="fee" inputMode="decimal" value={deliveryFee} onChange={(e) => setDeliveryFee(e.target.value)} className="text-base" />
                </div>
              </div>
            )}

            <div className="mt-5 space-y-2">
              <Label htmlFor="pickup">Pickup / handoff instructions</Label>
              <Textarea
                id="pickup"
                value={pickupInstructions}
                onChange={(e) => setPickupInstructions(e.target.value)}
                placeholder="Where renters meet you, hours, parking notes…"
                rows={3}
                className="text-base"
              />
            </div>

            <div className="mt-7">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm font-medium text-foreground">Documents renters must provide</p>
              </div>
              <div className="mt-3 space-y-2">
                {DOC_OPTIONS.map((doc) => (
                  <label key={doc} className="flex cursor-pointer items-center gap-3 rounded-2xl bg-[#FBF8F3] p-3">
                    <Checkbox
                      checked={requiredDocs.includes(doc)}
                      onCheckedChange={(checked) =>
                        setRequiredDocs((prev) =>
                          checked ? [...new Set([...prev, doc])] : prev.filter((d) => d !== doc),
                        )
                      }
                    />
                    <span className="text-sm text-foreground">{DOCUMENT_TYPE_LABELS[doc]}</span>
                  </label>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Step 4 — Review */}
        {step === 3 && source && (
          <section className="overflow-hidden rounded-3xl border border-black/10 bg-white shadow-sm">
            {source.cover_image_url && (
              <img src={source.cover_image_url} alt={source.title ?? ''} className="h-48 w-full object-cover" loading="lazy" />
            )}
            <div className="p-6 sm:p-9">
              <h2 className="text-2xl font-semibold text-foreground">Review your rental</h2>
              <p className="mt-1 text-sm text-muted-foreground">{source.title}</p>

              <dl className="mt-6 divide-y divide-black/5">
                {[
                  ['Daily rate', money(numberOrNull(priceDaily))],
                  ['Weekly rate', money(numberOrNull(priceWeekly))],
                  ['Monthly rate', money(numberOrNull(priceMonthly))],
                  ['Security deposit', money(numberOrNull(deposit))],
                  ['Minimum length', `${numberOrNull(minDays) ?? 1} day(s)`],
                  ['Available from', availableFrom || 'Available now'],
                  ['Booking method', instantBook ? 'Instant Book' : 'Request to Book'],
                  ['Fulfillment', fulfillment],
                  ['Required documents', requiredDocs.length ? `${requiredDocs.length} selected` : 'None'],
                  ['Location', [source.city, source.state].filter(Boolean).join(', ') || '—'],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between gap-4 py-3">
                    <dt className="text-sm text-muted-foreground">{label}</dt>
                    <dd className="text-sm font-medium capitalize text-foreground">{value}</dd>
                  </div>
                ))}
              </dl>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button size="lg" className="flex-1" onClick={publish} disabled={publishing}>
                  {publishing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CalendarDays className="mr-2 h-4 w-4" />}
                  Publish rental
                </Button>
                {rental && (
                  <Button size="lg" variant="outline" asChild>
                    <Link to={`/create-listing/${rental.id}`}>
                      <Pencil className="mr-2 h-4 w-4" /> Edit asset details
                    </Link>
                  </Button>
                )}
              </div>
              <p className="mt-4 text-xs text-muted-foreground">
                Your sale listing stays exactly as it is. This rental is a separate listing for the same truck.
              </p>
            </div>
          </section>
        )}

        {step >= 0 && step <= 2 && (
          <div className="mt-6 flex justify-end">
            <Button size="lg" onClick={goNext} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Continue <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default RentItOut;
