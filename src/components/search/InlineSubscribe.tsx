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
        
        // Send admin notification (fire and forget)
        supabase.functions.invoke('send-admin-notification', {
          body: { type: 'newsletter_signup', data: { email, source: 'search_inline' } }
        }).catch(err => console.error('Admin notification error:', err));
      }
    } catch (err) {
      toast.error('Failed to subscribe. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubscribed) {
    return (
      <div className="bg-card border-0 shadow-lg rounded-2xl p-5 flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center shadow-lg shrink-0">
          <CheckCircle2 className="h-6 w-6 text-white" />
        </div>
        <p className="text-sm text-muted-foreground">You're subscribed! We'll send you new listings.</p>
      </div>
    );
  }

  return (
    <div className="bg-card border-0 shadow-lg rounded-2xl p-5">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shrink-0">
          <Mail className="h-5 w-5 text-primary-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-foreground">Get new listings in your inbox</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Monthly updates, no spam.</p>
          <form onSubmit={handleSubmit} className="flex gap-2 mt-3">
            <Input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-10 text-sm rounded-xl border-border/60 focus:border-primary"
              required
            />
            <Button 
              type="submit" 
              variant="dark-shine"
              size="sm" 
              className="h-10 shrink-0 rounded-xl px-4"
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
