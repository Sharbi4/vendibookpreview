import { useState } from 'react';
import { Mail, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const InlineSubscribe = () => {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('newsletter_subscribers')
        .insert({ email, source: 'search_inline' });

      if (error) {
        if (error.code === '23505') {
          toast.info('You\'re already subscribed!');
        } else {
          throw error;
        }
      } else {
        setIsSubscribed(true);
        toast.success('Subscribed successfully!');
      }
    } catch (err) {
      toast.error('Failed to subscribe. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubscribed) {
    return (
      <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
        <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
        <p className="text-sm text-muted-foreground">You're subscribed! We'll send you new listings.</p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-start gap-3">
        <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Mail className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-foreground">Get new listings in your inbox</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Monthly updates, no spam.</p>
          <form onSubmit={handleSubmit} className="flex gap-2 mt-3">
            <Input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-9 text-sm"
              required
            />
            <Button 
              type="submit" 
              size="sm" 
              className="h-9 shrink-0"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Subscribing...' : 'Subscribe'}
              {!isSubmitting && <ArrowRight className="h-3 w-3 ml-1" />}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default InlineSubscribe;
