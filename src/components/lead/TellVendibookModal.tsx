import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle2, Loader2, ArrowRight, ArrowLeft} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';
import { trackLeadEvent } from '@/lib/leadTracking';
import { ConciergeTrustLine } from './ConciergeTrustLine';

export type LeadIntent = 'rent' | 'buy' | 'list' | 'sell';
export type LeadCategory = 'food_truck' | 'food_trailer' | 'commercial_kitchen' | 'vendor_space';

interface TellVendibookModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultIntent?: LeadIntent;
  defaultCategory?: LeadCategory;
  defaultCity?: string;
  listingId?: string;
  sourcePage?: string;
}

const INTENT_OPTIONS: { value: LeadIntent; label: string; sub: string }[] = [
  { value: 'rent', label: 'Rent', sub: 'A truck, trailer, kitchen, or space' },
  { value: 'buy', label: 'Buy', sub: 'A truck or trailer to own' },
  { value: 'list', label: 'List', sub: 'My asset for rent' },
  { value: 'sell', label: 'Sell', sub: 'My asset outright' }];

const CATEGORY_OPTIONS: { value: LeadCategory; label: string }[] = [
  { value: 'food_truck', label: 'Food truck' },
  { value: 'food_trailer', label: 'Food trailer' },
  { value: 'commercial_kitchen', label: 'Commercial kitchen' },
  { value: 'vendor_space', label: 'Vendor space' }];

const TIMELINE_OPTIONS = [
  { value: 'asap', label: 'ASAP' },
  { value: '2_weeks', label: 'Within 2 weeks' },
  { value: '1_month', label: 'Within 1 month' },
  { value: '1_3_months', label: '1–3 months' },
  { value: 'exploring', label: 'Just exploring' }];

const BUDGET_RENT = [
  { value: 'lt_500', label: 'Under $500' },
  { value: '500_1500', label: '$500 – $1.5k' },
  { value: '1500_5k', label: '$1.5k – $5k' },
  { value: 'gt_5k', label: '$5k+' }];
const BUDGET_BUY = [
  { value: 'lt_25k', label: 'Under $25k' },
  { value: '25k_60k', label: '$25k – $60k' },
  { value: '60k_120k', label: '$60k – $120k' },
  { value: 'gt_120k', label: '$120k+' }];

// Step 1 schema — only the essentials: intent, city, and at least one contact channel.
const step1Schema = z.object({
  intent: z.enum(['rent', 'buy', 'list', 'sell']),
  city: z.string().trim().min(2, 'Enter your city / state').max(120),
  email: z.string().trim().email().max(160).optional().or(z.literal('')),
  phone: z.string().trim().max(40).optional().or(z.literal(''))}).refine((d) => (d.email && d.email.length > 0) || (d.phone && d.phone.length >= 7), {
  message: 'Add an email or phone so we can reach you',
  path: ['email']});

const budgetToRange = (budget: string): { budget_min: number | null; budget_max: number | null } => {
  switch (budget) {
    case 'lt_500': return { budget_min: 0, budget_max: 500 };
    case '500_1500': return { budget_min: 500, budget_max: 1500 };
    case '1500_5k': return { budget_min: 1500, budget_max: 5000 };
    case 'gt_5k': return { budget_min: 5000, budget_max: null };
    case 'lt_25k': return { budget_min: 0, budget_max: 25000 };
    case '25k_60k': return { budget_min: 25000, budget_max: 60000 };
    case '60k_120k': return { budget_min: 60000, budget_max: 120000 };
    case 'gt_120k': return { budget_min: 120000, budget_max: null };
    default: return { budget_min: null, budget_max: null };
  }
};

export const TellVendibookModal = ({
  open,
  onOpenChange,
  defaultIntent,
  defaultCategory,
  defaultCity,
  listingId,
  sourcePage}: TellVendibookModalProps) => {
  const { toast } = useToast();
  const [step, setStep] = useState<1 | 2>(1);
  // Step 1 — required
  const [intent, setIntent] = useState<LeadIntent>(defaultIntent || 'rent');
  const [city, setCity] = useState(defaultCity || '');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  // Step 2 — optional
  const [category, setCategory] = useState<LeadCategory | ''>(defaultCategory || '');
  const [timeline, setTimeline] = useState('');
  const [budget, setBudget] = useState('');
  const [notes, setNotes] = useState('');
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [openedAt, setOpenedAt] = useState<number | null>(null);
  const [lastFieldTouched, setLastFieldTouched] = useState<string | null>(null);
  const [fieldsCompleted, setFieldsCompleted] = useState<Set<string>>(new Set());

  // Fire lead_form_started once per open
  useEffect(() => {
    if (open && !submitted) {
      setOpenedAt(Date.now());
      setLastFieldTouched(null);
      setFieldsCompleted(new Set());
      trackLeadEvent('lead_form_started', {
        intent: defaultIntent,
        category: defaultCategory,
        city: defaultCity,
        listing_id: listingId,
        source: sourcePage});
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (defaultIntent) setIntent(defaultIntent); }, [defaultIntent]);
  useEffect(() => { if (defaultCategory) setCategory(defaultCategory); }, [defaultCategory]);
  useEffect(() => { if (defaultCity) setCity(defaultCity); }, [defaultCity]);

  const budgetOptions = intent === 'buy' || intent === 'sell' ? BUDGET_BUY : BUDGET_RENT;

  const trackBlur = (field: string, value: string) => {
    const hasValue = value.trim().length > 0;
    setLastFieldTouched(field);
    setFieldsCompleted((prev) => {
      const next = new Set(prev);
      if (hasValue) next.add(field); else next.delete(field);
      return next;
    });
    trackLeadEvent('lead_form_field_blur', {
      field_name: field,
      has_value: hasValue,
      char_count: value.trim().length,
      step,
      listing_id: listingId,
      source: sourcePage});
  };

  const handleNext = () => {
    const parsed = step1Schema.safeParse({ intent, city, email, phone });
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      trackLeadEvent('lead_form_validation_error', {
        field_name: String(issue?.path?.[0] ?? 'unknown'),
        error_message: issue?.message ?? 'invalid',
        step: 1,
        listing_id: listingId,
        source: sourcePage});
      toast({ title: 'Almost there', description: issue?.message, variant: 'destructive' });
      return;
    }
    setStep(2);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    // Re-validate step 1 in case the user skipped via keyboard
    const parsed = step1Schema.safeParse({ intent, city, email, phone });
    if (!parsed.success) {
      setStep(1);
      const issue = parsed.error.issues[0];
      trackLeadEvent('lead_form_validation_error', {
        field_name: String(issue?.path?.[0] ?? 'unknown'),
        error_message: issue?.message ?? 'invalid',
        step,
        listing_id: listingId,
        source: sourcePage});
      toast({ title: 'Almost there', description: issue?.message, variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    try {
      const range = budgetToRange(budget);
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await (supabase.from('asset_requests') as any).insert({
        user_id: user?.id || null,
        intent,
        asset_type: category || null,
        city: city.trim(),
        timeline: timeline || null,
        budget_min: range.budget_min,
        budget_max: range.budget_max,
        name: name.trim() || null,
        email: email.trim() || null,
        phone: phone.trim() || null,
        notes: notes.trim() || null,
        source_page: sourcePage || (typeof window !== 'undefined' ? window.location.pathname : null),
        listing_id: listingId || null,
        title: `${intent.toUpperCase()} · ${category ? CATEGORY_OPTIONS.find((c) => c.value === category)?.label : 'Any'} · ${city.trim()}`});

      if (error) throw error;

      trackLeadEvent('lead_form_submitted', {
        intent,
        category: category || undefined,
        city: city.trim(),
        listing_id: listingId,
        source: sourcePage,
        has_email: !!email,
        has_phone: !!phone,
        completed_step_2: !!(category || timeline || budget || notes || name)});

      // Fire-and-forget confirmation emails (do not block UX)
      const intentLabel = INTENT_OPTIONS.find((o) => o.value === intent)?.label || intent;
      const categoryLabel = category ? CATEGORY_OPTIONS.find((c) => c.value === category)?.label : 'Any asset';
      const leadKey = `${(email || phone || 'anon').toLowerCase()}-${Date.now()}`;
      const firstName = (name.trim().split(/\s+/)[0]) || undefined;

      // Confirmation to the requester + internal notification to support
      supabase.functions.invoke('send-lead-confirmation', {
        body: {
          leadKey,
          firstName,
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          intentLabel,
          categoryLabel,
          city: city.trim(),
          timeline,
          budget,
          notes: notes.trim(),
          listingId,
          sourcePage: sourcePage || (typeof window !== 'undefined' ? window.location.pathname : 'site'),
        }}).catch((err) => console.warn('[TellVendibook] lead emails failed', err));

      setSubmitted(true);
      toast({ title: 'We got it — talk soon!', description: 'Vendibook will follow up within 1 business hour.' });
    } catch (err) {
      console.error('[TellVendibook] insert failed', err);
      toast({ title: 'Something went wrong', description: 'Please try again or call (725) 755-9598.', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = (next: boolean) => {
    if (!next) {
      // Fire abandon event if user started but did not submit
      if (open && !submitted) {
        trackLeadEvent('lead_form_abandoned', {
          last_field_touched: lastFieldTouched,
          seconds_in_form: openedAt ? Math.round((Date.now() - openedAt) / 1000) : null,
          fields_completed: Array.from(fieldsCompleted),
          step,
          listing_id: listingId,
          source: sourcePage});
      }
      setTimeout(() => { setSubmitted(false); setStep(1); }, 300);
    }
    onOpenChange(next);
  };

  const labelCls = 'text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground/60';
  const inputCls = 'bg-white/[0.03] border-white/[0.08] text-[16px]';

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[92vh] overflow-y-auto p-0 gap-0 border-white/10 bg-[#0c0c0e]">
        <div className="p-6 pb-4 border-b border-white/[0.06]">
          <DialogHeader className="space-y-2 text-left">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-semibold uppercase tracking-[0.14em] w-fit">
              
              Vendibook Concierge · Step {submitted ? '✓' : step} of 2
            </div>
            <DialogTitle className="text-xl sm:text-2xl font-semibold text-foreground">
              {submitted
                ? "You're in good hands."
                : step === 1
                  ? 'Tell Vendibook what you need'
                  : 'A few more details (optional)'}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              {submitted
                ? 'A concierge will reach out within 1 business hour.'
                : step === 1
                  ? "Two quick fields. We'll do the rest."
                  : 'These help us match faster — skip any field you want.'}
            </DialogDescription>
          </DialogHeader>
        </div>

        {submitted ? (
          <div className="p-8 text-center space-y-4">
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/15 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              We'll confirm availability, pricing, and next steps before you commit to anything.
            </p>
            <Button onClick={() => handleClose(false)} variant="outline" className="mt-2">Close</Button>
          </div>
        ) : step === 1 ? (
          <div className="p-6 space-y-5">
            {/* CITY */}
            <div className="space-y-2">
              <Label htmlFor="tv-city" className={labelCls}>City / State</Label>
              <Input
                id="tv-city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                onBlur={(e) => trackBlur('city', e.target.value)}
                placeholder="e.g. Austin, TX"
                className={inputCls}
                required
              />
            </div>

            {/* EMAIL or PHONE */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="tv-email" className={labelCls}>Email</Label>
                <Input id="tv-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} onBlur={(e) => trackBlur('email', e.target.value)} className={inputCls} placeholder="you@example.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tv-phone" className={labelCls}>Phone</Label>
                <Input id="tv-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} onBlur={(e) => trackBlur('phone', e.target.value)} className={inputCls} placeholder="(555) 555-5555" />
              </div>
            </div>

            <p className="text-[11px] text-foreground/40 -mt-2">Email <em>or</em> phone — whichever's easiest.</p>

            <ConciergeTrustLine />

            <div className="flex gap-2">
              <Button type="button" onClick={handleNext} variant="dark-shine" size="lg" className="flex-1 rounded-full gap-2">
                Continue <ArrowRight className="w-4 h-4" />
              </Button>
              <Button type="button" onClick={() => handleSubmit()} disabled={submitting} variant="glass-cta" size="lg" className="rounded-full">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send now'}
              </Button>
            </div>
            <p className="text-[11px] text-foreground/40 text-center">
              "Send now" submits with just the essentials.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {/* NAME (optional) */}
            <div className="space-y-2">
              <Label htmlFor="tv-name" className={labelCls}>Your name <span className="text-foreground/30 normal-case font-normal">(optional)</span></Label>
              <Input id="tv-name" value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
            </div>

            {/* CATEGORY */}
            <div className="space-y-2">
              <Label className={labelCls}>Category <span className="text-foreground/30 normal-case font-normal">(optional)</span></Label>
              <div className="flex flex-wrap gap-2">
                {CATEGORY_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setCategory(category === opt.value ? '' : opt.value)}
                    className={`text-sm px-3 py-1.5 rounded-full border transition-all ${
                      category === opt.value
                        ? 'border-primary bg-primary/10 text-foreground'
                        : 'border-white/[0.08] bg-white/[0.02] text-foreground/75 hover:border-white/20'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* TIMELINE */}
            <div className="space-y-2">
              <Label className={labelCls}>Timeline <span className="text-foreground/30 normal-case font-normal">(optional)</span></Label>
              <div className="flex flex-wrap gap-2">
                {TIMELINE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setTimeline(timeline === opt.value ? '' : opt.value)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                      timeline === opt.value
                        ? 'border-primary bg-primary/10 text-foreground'
                        : 'border-white/[0.08] bg-white/[0.02] text-foreground/75 hover:border-white/20'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* BUDGET */}
            <div className="space-y-2">
              <Label className={labelCls}>
                Budget {intent === 'rent' || intent === 'list' ? '(per day)' : '(total)'} <span className="text-foreground/30 normal-case font-normal">(optional)</span>
              </Label>
              <div className="flex flex-wrap gap-2">
                {budgetOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setBudget(budget === opt.value ? '' : opt.value)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                      budget === opt.value
                        ? 'border-primary bg-primary/10 text-foreground'
                        : 'border-white/[0.08] bg-white/[0.02] text-foreground/75 hover:border-white/20'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* NOTES */}
            <div className="space-y-2">
              <Label htmlFor="tv-notes" className={labelCls}>Notes <span className="text-foreground/30 normal-case font-normal">(optional)</span></Label>
              <Textarea
                id="tv-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Dates, equipment, dietary needs, build-out, budget context…"
                className="bg-white/[0.03] border-white/[0.08] min-h-[80px]"
                maxLength={1000}
              />
            </div>

            <ConciergeTrustLine />

            <div className="flex gap-2">
              <Button type="button" onClick={() => setStep(1)} variant="outline" size="lg" className="rounded-full gap-2">
                <ArrowLeft className="w-4 h-4" /> Back
              </Button>
              <Button type="submit" disabled={submitting} variant="dark-shine" size="lg" className="flex-1 rounded-full gap-2">
                {submitting ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</>
                ) : (
                  <>Send to Vendibook <ArrowRight className="w-4 h-4" /></>
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default TellVendibookModal;
