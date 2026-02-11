import { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, CheckCircle, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const InlineNewsletterCard = () => {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) {
      toast.error('Please enter a valid email address.');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('newsletter_subscribers').insert({
        email: trimmed,
        source: 'inline_search',
      });

      if (error) {
        // Handle unique constraint (already subscribed)
        if (error.code === '23505') {
          setIsSubmitted(true);
          toast.info("You're already subscribed!");
          return;
        }
        throw error;
      }

      setIsSubmitted(true);
      toast.success('Subscribed! Watch your inbox for deals & new listings.');
    } catch (err) {
      console.error('Newsletter signup error:', err);
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="col-span-1 sm:col-span-2 rounded-2xl bg-gradient-to-br from-emerald-50 to-emerald-100/50 border border-emerald-200 p-6 flex items-center justify-center gap-3"
      >
        <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
        <span className="text-sm font-medium text-emerald-700">You're subscribed! We'll send you deals & new listings.</span>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="col-span-1 sm:col-span-2 rounded-2xl bg-white/70 backdrop-blur-xl border border-white/60 shadow-lg shadow-black/5 p-5 sm:p-6"
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[hsl(14,100%,57%)] to-[hsl(40,100%,49%)] flex items-center justify-center shadow-md">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Get deals & new listings</h3>
            <p className="text-xs text-muted-foreground">Be the first to know. Unsubscribe anytime.</p>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="flex-1 w-full sm:w-auto">
          <div className="flex items-center gap-2 p-1 rounded-xl bg-background border border-border shadow-sm">
            <Mail className="w-4 h-4 text-muted-foreground ml-2 shrink-0" />
            <Input
              type="email"
              placeholder="you@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              maxLength={255}
              className="border-0 shadow-none h-8 text-sm focus-visible:ring-0 px-1"
            />
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className="rounded-lg bg-foreground text-background hover:bg-foreground/90 text-xs font-semibold px-4 shrink-0"
            >
              {isSubmitting ? 'Joining...' : 'Subscribe'}
            </Button>
          </div>
        </form>
      </div>
    </motion.div>
  );
};

export default InlineNewsletterCard;
