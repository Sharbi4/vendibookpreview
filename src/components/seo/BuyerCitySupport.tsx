import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, CreditCard, Headset, MessageCircle, CheckCircle2 } from 'lucide-react';
import { BrandIcon } from '@/components/brand/BrandIcon';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useFinancingHandoff } from '@/hooks/useFinancingHandoff';
import { useEquinoxFinancingEnabled } from '@/hooks/useListingFinancing';
import { isAtlasEnabled, startAtlas } from '@/lib/atlas/atlasFlag';
import { trackBuyerSeoCta } from '@/lib/buyerSeoTracking';
import { supabase } from '@/integrations/supabase/client';

export function BuyerCitySupport({ city, path, category }: { city: string; path: string; category: string }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [receipt, setReceipt] = useState<{ reference_code: string; follow_up_by: string } | null>(null);
  const { startFinancingApply, financingLeadDialog } = useFinancingHandoff();
  const financing = useEquinoxFinancingEnabled({ mode: 'sale', status: 'published' });
  const track = (ctaId: string, destination: string) => trackBuyerSeoCta({ landingPage: path, ctaId, destination, ctaLocation: 'buyer_help', category });
  async function requestMeeting(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const fields = new FormData(event.currentTarget);
    setBusy(true); setError('');
    try {
      const { data, error: failure } = await supabase.functions.invoke('atlas-follow-up', { body: {
        name: String(fields.get('name')).trim(), email: String(fields.get('email')).trim(),
        phone: String(fields.get('phone') || '').trim(), preferred_contact: 'email',
        topic: `Buyer sales meeting — ${city}`,
        summary: `Buyer would like to arrange a meeting. Preferred times and time zone: ${fields.get('availability') || 'Please ask by email'}. Buying plans: ${fields.get('message') || 'Please help me compare listings'}`,
        page_url: `https://vendibook.com${path}`,
      } });
      if (failure || data?.error || !data?.reference_code) throw new Error('request_failed');
      setReceipt(data);
    } catch { setError('We could not save your request. Please try again or contact Vendibook.'); }
    finally { setBusy(false); }
  }
  return <section id="buyer-help" data-cta-location="buyer_help" className="scroll-mt-24 space-y-6" aria-labelledby="buyer-help-title">
    <div><p className="v2-home-eyebrow">A clearer path to ownership</p><h2 id="buyer-help-title" className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Your next move, with help when you need it.</h2></div>
    <div className={`grid gap-4 ${financing ? 'lg:grid-cols-3' : 'md:grid-cols-2'}`}>
      {financing && <article className="flex flex-col items-start rounded-3xl border border-border bg-white p-6 shadow-sm sm:p-8">
        <BrandIcon icon={CreditCard} size={52} /><p className="mt-6 text-xs font-semibold uppercase tracking-widest text-primary">Equinox Funding</p><h3 className="mt-2 text-xl font-semibold">A purchase plan that fits.</h3>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">Apply online for equipment financing. Personal and business credit are considered alongside your business details.</p>
        <Button className="mt-6 w-full" variant="cta" onClick={() => { track('city_financing_apply', '/financing'); startFinancingApply('buyer_city'); }}>Apply for financing <ArrowUpRight className="ml-2 h-4 w-4" /></Button>
        <Link to="/financing" className="mt-3 text-sm font-medium underline underline-offset-4">How financing works</Link>
        <p className="mt-5 text-xs leading-5 text-muted-foreground">Approval is not guaranteed. Rates, eligibility and terms are determined by Equinox Funding and/or its funding providers. Vendibook is not a lender.</p>
      </article>}
      <article className="flex flex-col items-start rounded-3xl border border-[#33414e] bg-[#202c36] p-6 text-white sm:p-8">
        <BrandIcon icon={MessageCircle} size={52} /><p className="mt-6 text-xs font-semibold uppercase tracking-widest text-orange-300">Atlas · AI sales assistant</p><h3 className="mt-2 text-xl font-semibold">Find your fit. Ask Atlas.</h3>
        <p className="mt-3 flex-1 text-sm leading-6 text-slate-300">Talk through your menu, budget and location. Get help comparing equipment, asking sellers questions and understanding your next step.</p>
        {isAtlasEnabled() ? <Button className="mt-6 w-full" variant="cta" onClick={() => { track('city_atlas', '/atlas'); startAtlas({ mode: 'text', topic: 'buy' }); }}>Chat with Atlas</Button> : <Button className="mt-6 w-full" variant="cta" asChild><Link to="/atlas">Meet Atlas</Link></Button>}
      </article>
      <article className="flex flex-col items-start rounded-3xl border border-border bg-white p-6 shadow-sm sm:p-8">
        <BrandIcon icon={Headset} tone="steel" size={52} /><p className="mt-6 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Vendibook sales team</p><h3 className="mt-2 text-xl font-semibold">Prefer a real conversation?</h3>
        <p className="mt-3 flex-1 text-sm leading-6 text-muted-foreground">Request a meeting with a person. Share what you’re looking for and a good time to connect; our team will help arrange it.</p>
        <Button className="mt-6 w-full" variant="outline" onClick={() => { track('city_sales_meeting', '/contact'); setOpen(true); }}>Request a sales meeting</Button>
        <p className="mt-4 text-xs leading-5 text-muted-foreground">Follow-up within 2 business hours, Monday–Friday, 8 AM–8 PM Eastern. Meeting time is confirmed with you.</p>
      </article>
    </div>
    {financingLeadDialog}
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg"><DialogHeader><DialogTitle>Meet with the Vendibook sales team</DialogTitle><DialogDescription>Tell us how to reach you. We’ll reply to arrange a time.</DialogDescription></DialogHeader>
      {receipt ? <div role="status" className="space-y-3 py-5"><CheckCircle2 className="h-9 w-9 text-green-700" /><h3 className="font-semibold">Your request is with our team.</h3><p className="text-sm">Follow-up by {receipt.follow_up_by}. Your meeting time will be confirmed by email.</p><p className="text-xs text-muted-foreground">Reference: {receipt.reference_code}</p></div> : <form onSubmit={requestMeeting} className="space-y-4">
        <div><Label htmlFor="buyer-sales-name">Name</Label><Input id="buyer-sales-name" name="name" required minLength={2} maxLength={80} autoComplete="name" className="text-base" /></div>
        <div><Label htmlFor="buyer-sales-email">Email</Label><Input id="buyer-sales-email" name="email" type="email" required maxLength={120} autoComplete="email" className="text-base" /></div>
        <div><Label htmlFor="buyer-sales-phone">Phone (optional)</Label><Input id="buyer-sales-phone" name="phone" type="tel" maxLength={30} autoComplete="tel" className="text-base" /></div>
        <div><Label htmlFor="buyer-sales-time">Preferred times and time zone (optional)</Label><Input id="buyer-sales-time" name="availability" maxLength={200} placeholder="e.g. weekday afternoons, Arizona time" className="text-base" /></div>
        <div><Label htmlFor="buyer-sales-message">What are you looking for? (optional)</Label><Textarea id="buyer-sales-message" name="message" maxLength={900} className="text-base" placeholder="Your menu, budget, location or a listing you like" /></div>
        <p className="text-xs leading-5 text-muted-foreground">By submitting, you ask Vendibook to contact you about this request. See our <Link to="/privacy" className="underline">Privacy Policy</Link>.</p>
        {error && <p role="alert" className="text-sm text-destructive">{error} <Link to="/contact" className="underline">Contact us</Link></p>}
        <Button type="submit" variant="cta" disabled={busy} className="w-full">{busy ? 'Sending request…' : 'Send meeting request'}</Button>
      </form>}
    </DialogContent></Dialog>
  </section>;
}
