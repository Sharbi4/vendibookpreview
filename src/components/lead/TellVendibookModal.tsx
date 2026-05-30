import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle2, Loader2, ArrowRight, Sparkles } from 'lucide-react';
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
  /** Pre-fills intent if known (e.g. on /sell-my-food-truck). */
  defaultIntent?: LeadIntent;
  defaultCategory?: LeadCategory;
  defaultCity?: string;
  /** Listing id when triggered from a specific listing. */
  listingId?: string;
  /** Page label stored alongside the lead for routing/analytics. */
  sourcePage?: string;
}

const INTENT_OPTIONS: { value: LeadIntent; label: string; sub: string }[] = [
  { value: 'rent', label: 'Rent', sub: 'A truck, trailer, kitchen, or space' },
  { value: 'buy', label: 'Buy', sub: 'A truck or trailer to own' },
  { value: 'list', label: 'List', sub: 'My asset for rent' },
  { value: 'sell', label: 'Sell', sub: 'My asset outright' },
];

const CATEGORY_OPTIONS: { value: LeadCategory; label: string }[] = [
  { value: 'food_truck', label: 'Food truck' },
  { value: 'food_trailer', label: 'Food trailer' },
  { value: 'commercial_kitchen', label: 'Commercial kitchen' },
  { value: 'vendor_space', label: 'Vendor space' },
];

const TIMELINE_OPTIONS = [
  { value: 'asap', label: 'ASAP' },
  { value: '2_weeks', label: 'Within 2 weeks' },
  { value: '1_month', label: 'Within 1 month' },
  { value: '1_3_months', label: '1–3 months' },
  { value: 'exploring', label: 'Just exploring' },
];

const BUDGET_RENT = [
  { value: 'lt_500', label: 'Under $500' },
  { value: '500_1500', label: '$500 – $1.5k' },
  { value: '1500_5k', label: '$1.5k – $5k' },
  { value: 'gt_5k', label: '$5k+' },
];
const BUDGET_BUY = [
  { value: 'lt_25k', label: 'Under $25k' },
  { value: '25k_60k', label: '$25k – $60k' },
  { value: '60k_120k', label: '$60k – $120k' },
  { value: 'gt_120k', label: '$120k+' },
];

const schema = z.object({
  intent: z.enum(['rent', 'buy', 'list', 'sell']),
  category: z.enum(['food_truck', 'food_trailer', 'commercial_kitchen', 'vendor_space']),
  city: z.string().trim().min(2, 'Enter your city / state').max(120),
  timeline: z.string().min(1, 'Pick a timeline'),
  budget: z.string().min(1, 'Pick a budget range'),
  name: z.string().trim().min(2, 'Enter your name').max(80),
  email: z.string().trim().email('Enter a valid email').max(160),
  phone: z.string().trim().max(40).optional().or(z.literal('')),
  notes: z.string().trim().max(1000).optional().or(z.literal('')),
});

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
  sourcePage,
}: TellVendibookModalProps) => {
  const { toast } = useToast();
  const [intent, setIntent] = useState<LeadIntent>(defaultIntent || 'rent');
  const [category, setCategory] = useState<LeadCategory>(defaultCategory || 'food_truck');
  const [city, setCity] = useState(defaultCity || '');
  const [timeline, setTimeline] = useState('');
  const [budget, setBudget] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Fire lead_form_started exactly once per open
  useEffect(() => {
    if (open && !submitted) {
      trackLeadEvent('lead_form_started', {
        intent: defaultIntent,
        category: defaultCategory,
        city: defaultCity,
        listing_id: listingId,
        source: sourcePage,
      });
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync defaults if they change while open
  useEffect(() => {
    if (defaultIntent) setIntent(defaultIntent);
  }, [defaultIntent]);
  useEffect(() => {
    if (defaultCategory) setCategory(defaultCategory);
  }, [defaultCategory]);
  useEffect(() => {
    if (defaultCity) setCity(defaultCity);
  }, [defaultCity]);

  const budgetOptions = intent === 'buy' || intent === 'sell' ? BUDGET_BUY : BUDGET_RENT;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({ intent, category, city, timeline, budget, name, email, phone, notes });
    if (!parsed.success) {
      toast({ title: 'Please complete the form', description: parsed.error.issues[0]?.message, variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    try {
      const range = budgetToRange(budget);
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await (supabase.from('asset_requests') as any).insert({
        user_id: user?.id || null,
        intent,
        asset_type: category,
        city: city.trim(),
        timeline,
        budget_min: range.budget_min,
        budget_max: range.budget_max,
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || null,
        notes: notes.trim() || null,
        source_page: sourcePage || (typeof window !== 'undefined' ? window.location.pathname : null),
        listing_id: listingId || null,
        title: `${intent.toUpperCase()} · ${CATEGORY_OPTIONS.find((c) => c.value === category)?.label} · ${city.trim()}`,
      });

      if (error) throw error;

      trackLeadEvent('lead_form_submitted', {
        intent,
        category,
        city: city.trim(),
        listing_id: listingId,
        source: sourcePage,
      });

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
      // reset success state when closed
      setTimeout(() => setSubmitted(false), 300);
    }
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[92vh] overflow-y-auto p-0 gap-0 border-white/10 bg-[#0c0c0e]">
        {/* Header */}
        <div className="p-6 pb-4 border-b border-white/[0.06]">
          <DialogHeader className="space-y-2 text-left">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-semibold uppercase tracking-[0.14em] w-fit">
              <Sparkles className="w-3 h-3" />
              Vendibook Concierge
            </div>
            <DialogTitle className="text-xl sm:text-2xl font-semibold text-foreground">
              Tell Vendibook what you need
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              We'll match you with verified options, confirm availability, and walk you through next steps.
            </DialogDescription>
          </DialogHeader>
        </div>

        {submitted ? (
          <div className="p-8 text-center space-y-4">
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/15 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">You're in good hands.</h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              A Vendibook concierge will text or email you within <strong>1 business hour</strong>. We'll
              confirm availability, pricing, and next steps before you commit to anything.
            </p>
            <Button onClick={() => handleClose(false)} variant="outline" className="mt-2">Close</Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {/* INTENT */}
            <div className="space-y-2">
              <Label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground/60">I want to</Label>
              <div className="grid grid-cols-2 gap-2">
                {INTENT_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setIntent(opt.value)}
                    className={`text-left rounded-xl border px-3 py-2.5 transition-all ${
                      intent === opt.value
                        ? 'border-primary bg-primary/10 text-foreground'
                        : 'border-white/[0.08] bg-white/[0.02] text-foreground/80 hover:border-white/20 hover:bg-white/[0.04]'
                    }`}
                  >
                    <div className="text-sm font-semibold">{opt.label}</div>
                    <div className="text-[11px] text-muted-foreground leading-tight mt-0.5">{opt.sub}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* CATEGORY */}
            <div className="space-y-2">
              <Label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground/60">Category</Label>
              <div className="flex flex-wrap gap-2">
                {CATEGORY_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setCategory(opt.value)}
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

            {/* CITY */}
            <div className="space-y-2">
              <Label htmlFor="tv-city" className="text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground/60">City / State</Label>
              <Input
                id="tv-city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. Austin, TX"
                className="bg-white/[0.03] border-white/[0.08] text-[16px]"
                required
              />
            </div>

            {/* TIMELINE */}
            <div className="space-y-2">
              <Label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground/60">Timeline</Label>
              <div className="flex flex-wrap gap-2">
                {TIMELINE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setTimeline(opt.value)}
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
              <Label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground/60">
                Budget {intent === 'rent' || intent === 'list' ? '(per day)' : '(total)'}
              </Label>
              <div className="flex flex-wrap gap-2">
                {budgetOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setBudget(opt.value)}
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

            {/* CONTACT */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="tv-name" className="text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground/60">Name</Label>
                <Input id="tv-name" value={name} onChange={(e) => setName(e.target.value)} className="bg-white/[0.03] border-white/[0.08] text-[16px]" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tv-email" className="text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground/60">Email</Label>
                <Input id="tv-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="bg-white/[0.03] border-white/[0.08] text-[16px]" required />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tv-phone" className="text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground/60">Phone <span className="text-foreground/30 normal-case font-normal">(optional, fastest reply)</span></Label>
              <Input id="tv-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="bg-white/[0.03] border-white/[0.08] text-[16px]" placeholder="(555) 555-5555" />
            </div>

            {/* NOTES */}
            <div className="space-y-2">
              <Label htmlFor="tv-notes" className="text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground/60">Notes <span className="text-foreground/30 normal-case font-normal">(optional)</span></Label>
              <Textarea
                id="tv-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Anything specific — dates, equipment, dietary, build-out, budget context…"
                className="bg-white/[0.03] border-white/[0.08] min-h-[80px]"
                maxLength={1000}
              />
            </div>

            <ConciergeTrustLine />

            <Button
              type="submit"
              disabled={submitting}
              variant="dark-shine"
              size="lg"
              className="w-full rounded-full gap-2"
            >
              {submitting ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</>
              ) : (
                <>Send to Vendibook <ArrowRight className="w-4 h-4" /></>
              )}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default TellVendibookModal;
