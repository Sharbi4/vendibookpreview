import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Bell } from 'lucide-react';

interface Props {
  category?: string;
  city?: string;
  zipCode?: string;
}

const SHOWN_KEY = 'vb_exit_intent_shown';

/**
 * Triggers a "get notified" modal on exit intent (mouseleave top edge on desktop,
 * or scroll-up after 30s on mobile). Captures email into availability_alerts.
 */
const ExitIntentCapture = ({ category, city, zipCode }: Props) => {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [zip, setZip] = useState(zipCode || '');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem(SHOWN_KEY)) return;

    let mobileTimer: number | null = null;
    let lastScrollY = window.scrollY;
    let scrolledUpOnce = false;

    const trigger = () => {
      if (sessionStorage.getItem(SHOWN_KEY)) return;
      sessionStorage.setItem(SHOWN_KEY, '1');
      setOpen(true);
    };

    const onMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 0) trigger();
    };

    const onScroll = () => {
      const y = window.scrollY;
      if (y < lastScrollY - 50 && y < 200 && scrolledUpOnce) trigger();
      if (y > 400) scrolledUpOnce = true;
      lastScrollY = y;
    };

    if (window.matchMedia('(min-width: 768px)').matches) {
      document.addEventListener('mouseleave', onMouseLeave);
    } else {
      mobileTimer = window.setTimeout(() => {
        window.addEventListener('scroll', onScroll, { passive: true });
      }, 30_000);
    }

    return () => {
      document.removeEventListener('mouseleave', onMouseLeave);
      window.removeEventListener('scroll', onScroll);
      if (mobileTimer) clearTimeout(mobileTimer);
    };
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !zip) return;
    setSubmitting(true);
    const { error } = await supabase.from('availability_alerts').insert({
      email,
      zip_code: zip,
      category: category || null,
    } as any);
    setSubmitting(false);
    if (error) {
      toast({ title: 'Could not save', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: "You're on the list! 🔔", description: 'We will email you when matching listings appear.' });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
            <Bell className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-center">Don't miss the next one</DialogTitle>
          <DialogDescription className="text-center">
            Get notified when {category ? `new ${category.replace('_', ' ')}s` : 'matching listings'}
            {city ? ` in ${city}` : ''} are posted. No spam — only the good stuff.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <Label>Email</Label>
            <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          </div>
          <div>
            <Label>Zip code</Label>
            <Input required value={zip} onChange={(e) => setZip(e.target.value)} placeholder="77001" />
          </div>
          <Button type="submit" variant="dark-shine" className="w-full" disabled={submitting}>
            {submitting ? 'Saving…' : 'Notify me'}
          </Button>
          <p className="text-[11px] text-muted-foreground text-center">
            Unsubscribe anytime. We never share your email.
          </p>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ExitIntentCapture;
