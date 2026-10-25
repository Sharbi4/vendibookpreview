import { useId, useRef, useState } from 'react';
import { z } from 'zod';
import { Loader2, Send } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

export type GuestRequestKind = 'message' | 'buy' | 'rent';

const SOURCE: Record<GuestRequestKind, string> = {
  message: 'guest_inquiry',
  buy: 'guest_request_to_buy',
  rent: 'guest_request_to_book',
};

const schema = z.object({
  name: z.string().trim().min(1, 'Enter your name').max(200),
  email: z.string().trim().email('Enter a valid email').max(320),
  phone: z.string().trim().regex(/^[+()\-.\s\d]{7,40}$/, 'Enter a valid phone number'),
  message: z.string().trim().max(4000),
});

interface GuestRequestFormProps {
  listingId: string;
  hostId: string;
  kind: GuestRequestKind;
  defaultMessage?: string;
  /** Extra request details (e.g. dates) saved with the message. */
  details?: string;
  submitLabel?: string;
}

/** Guest (signed-out) message or request: name, email and phone are required, not verified. */
export const GuestRequestForm = ({ listingId, hostId, kind, defaultMessage = '', details, submitLabel }: GuestRequestFormProps) => {
  const { toast } = useToast();
  const uid = useId();
  const sending = useRef(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', message: defaultMessage });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sending.current) return;
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      const fe: Record<string, string> = {};
      parsed.error.errors.forEach((er) => { if (er.path[0]) fe[String(er.path[0])] = er.message; });
      setErrors(fe);
      return;
    }
    if (kind === 'message' && !parsed.data.message) {
      setErrors({ message: 'Write a message' });
      return;
    }
    setErrors({});
    sending.current = true;
    setLoading(true);
    try {
      const id = crypto.randomUUID();
      const message = [details, parsed.data.message].filter(Boolean).join('\n\n') || null;
      const { error } = await supabase.from('listing_leads').insert({
        id,
        listing_id: listingId,
        host_id: hostId,
        name: parsed.data.name,
        email: parsed.data.email,
        phone: parsed.data.phone,
        message,
        source: SOURCE[kind],
      });
      if (error) throw error;
      supabase.functions.invoke('notify-listing-lead', { body: { lead_id: id } }).catch(() => {});
      setSent(true);
    } catch (err) {
      console.error('Guest request failed', err);
      toast({ title: 'Something went wrong', description: 'Please try again.', variant: 'destructive' });
    } finally {
      setLoading(false);
      sending.current = false;
    }
  };

  if (sent) {
    return (
      <div role="status" className="rounded-xl border border-border bg-muted/40 p-4 text-sm">
        <p className="font-semibold text-foreground">{kind === 'message' ? 'Message sent' : 'Request sent'}</p>
        <p className="mt-1 text-muted-foreground">We’ll follow up by email at {form.email.trim()}.</p>
      </div>
    );
  }

  const field = (k: 'name' | 'email' | 'phone', label: string, type: string, auto: string) => (
    <div className="space-y-1">
      <label htmlFor={`${uid}-${k}`} className="block text-sm font-medium">{label}</label>
      <Input id={`${uid}-${k}`} type={type} autoComplete={auto} value={form[k]} onChange={set(k)} className="text-base" disabled={loading} />
      {errors[k] && <p className="text-xs text-destructive">{errors[k]}</p>}
    </div>
  );

  return (
    <form onSubmit={submit} className="space-y-3" noValidate>
      {field('name', 'Your name', 'text', 'name')}
      <div className="grid gap-3 sm:grid-cols-2">
        {field('email', 'Email', 'email', 'email')}
        {field('phone', 'Phone', 'tel', 'tel')}
      </div>
      <div className="space-y-1">
        <label htmlFor={`${uid}-msg`} className="block text-sm font-medium">{kind === 'message' ? 'Your message' : 'Anything else? (optional)'}</label>
        <Textarea id={`${uid}-msg`} rows={4} maxLength={4000} value={form.message} onChange={set('message')} className="text-base" disabled={loading} />
        {errors.message && <p className="text-xs text-destructive">{errors.message}</p>}
      </div>
      <Button type="submit" variant="cta" className="w-full h-12" disabled={loading}>
        {loading ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <Send className="h-5 w-5 mr-2" />}
        {submitLabel ?? (kind === 'message' ? 'Send Message' : 'Send Request')}
      </Button>
    </form>
  );
};

export default GuestRequestForm;
