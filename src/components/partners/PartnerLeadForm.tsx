import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { submitPartnerLead, type ServicePartner } from '@/lib/partners/partners';
import { useAuth } from '@/contexts/AuthContext';

interface Props {
  partner: ServicePartner | null;
  listingId?: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const schema = z.object({
  service: z.string().trim().min(2, 'Please describe the service you need.').max(200),
  location: z.string().trim().max(200).optional().or(z.literal('')),
  budget: z.string().trim().max(50).optional().or(z.literal('')),
  timeline: z.string().trim().max(80).optional().or(z.literal('')),
  notes: z.string().trim().max(1000).optional().or(z.literal('')),
  contactName: z.string().trim().max(120).optional().or(z.literal('')),
  contactEmail: z.string().trim().email('Enter a valid email').max(200).optional().or(z.literal('')),
  contactPhone: z.string().trim().max(40).optional().or(z.literal('')),
});

/**
 * Partner lead form. Enforces explicit consent — no user info is shared
 * unless the checkbox is checked. Never auto-pre-checked.
 */
export function PartnerLeadForm({ partner, listingId, open, onOpenChange }: Props) {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [consent, setConsent] = useState(false);
  const [form, setForm] = useState({
    service: partner?.category ?? '',
    location: '',
    budget: '',
    timeline: '',
    notes: '',
    contactName: '',
    contactEmail: user?.email ?? '',
    contactPhone: '',
  });

  const update = (k: keyof typeof form, v: string) => setForm((s) => ({ ...s, [k]: v }));

  const submit = async () => {
    if (!partner) return;
    if (!user) {
      toast.error('Please sign in to send a partner request.');
      return;
    }
    if (!consent) {
      toast.error('Please confirm you want to share your info with this partner.');
      return;
    }
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? 'Please review the form.');
      return;
    }
    try {
      setBusy(true);
      await submitPartnerLead({
        partnerId: partner.id,
        listingId,
        consentGranted: true,
        ...parsed.data,
      });
      toast.success(`Your request was sent to ${partner.company_name}.`);
      onOpenChange(false);
      setConsent(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not send request.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Request info from {partner?.company_name ?? 'partner'}</DialogTitle>
          <DialogDescription>
            Vendibook will forward your request to this partner. We do not sell your info.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label htmlFor="service">What service do you need?</Label>
            <Input id="service" value={form.service} onChange={(e) => update('service', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="location">City / state</Label>
              <Input id="location" value={form.location} onChange={(e) => update('location', e.target.value)} />
            </div>
            <div>
              <Label htmlFor="timeline">Timeline</Label>
              <Input id="timeline" placeholder="Within 30 days" value={form.timeline} onChange={(e) => update('timeline', e.target.value)} />
            </div>
          </div>
          <div>
            <Label htmlFor="budget">Budget (optional)</Label>
            <Input id="budget" value={form.budget} onChange={(e) => update('budget', e.target.value)} />
          </div>
          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" rows={3} value={form.notes} onChange={(e) => update('notes', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="cn">Your name</Label>
              <Input id="cn" value={form.contactName} onChange={(e) => update('contactName', e.target.value)} />
            </div>
            <div>
              <Label htmlFor="cp">Phone</Label>
              <Input id="cp" value={form.contactPhone} onChange={(e) => update('contactPhone', e.target.value)} />
            </div>
          </div>
          <div>
            <Label htmlFor="ce">Email</Label>
            <Input id="ce" type="email" value={form.contactEmail} onChange={(e) => update('contactEmail', e.target.value)} />
          </div>

          <label className="flex items-start gap-2 rounded-lg border border-white/10 bg-white/[0.03] p-3 text-sm">
            <Checkbox
              checked={consent}
              onCheckedChange={(v) => setConsent(Boolean(v))}
              className="mt-0.5"
            />
            <span>
              I agree to share the info above with {partner?.company_name ?? 'this partner'} so
              they can contact me. Vendibook will not share my info without this consent.
            </span>
          </label>

          <Button onClick={submit} disabled={busy || !consent} className="w-full">
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Send request
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default PartnerLeadForm;
