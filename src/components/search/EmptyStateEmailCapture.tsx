import { useState } from 'react';
import { motion } from 'framer-motion';
import { Bell, CheckCircle, Truck, Utensils, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface EmptyStateEmailCaptureProps {
  locationText?: string;
  category?: string;
  mode?: string;
  onClearFilters: () => void;
}

export const EmptyStateEmailCapture = ({ locationText, category, mode, onClearFilters }: EmptyStateEmailCaptureProps) => {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('availability_alerts').insert({
        email: email.trim(),
        zip_code: locationText || 'any',
        category: category || null,
        mode: mode || null,
        radius_miles: 50,
      });

      if (error) throw error;
      setIsSubmitted(true);
      toast.success('You\'ll be notified when new listings match your search!');
    } catch (err) {
      console.error('Alert signup error:', err);
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative flex flex-col items-center justify-center py-20 px-6 rounded-3xl bg-white/50 backdrop-blur-2xl border border-white/60 shadow-xl">
      {/* Background orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-3xl">
        <motion.div
          animate={{ scale: [1, 1.4, 1], opacity: [0.2, 0.4, 0.2] }}
          transition={{ repeat: Infinity, duration: 5, ease: 'easeInOut' }}
          className="absolute top-1/4 left-1/4 w-56 h-56 rounded-full bg-[hsl(14,100%,57%)]/25 blur-[90px]"
        />
        <motion.div
          animate={{ scale: [1, 1.3, 1], opacity: [0.15, 0.3, 0.15] }}
          transition={{ repeat: Infinity, duration: 7, ease: 'easeInOut', delay: 1 }}
          className="absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full bg-[hsl(40,100%,49%)]/20 blur-[90px]"
        />
      </div>

      {/* Animated icon */}
      <motion.div
        animate={{ y: [0, -14, 0] }}
        transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
        className="relative mb-4"
      >
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[hsl(14,100%,57%)]/40 to-[hsl(40,100%,49%)]/40 blur-xl scale-150" />
        <div className="relative w-24 h-24 rounded-2xl bg-gradient-to-br from-[hsl(14,100%,57%)] to-[hsl(40,100%,49%)] flex items-center justify-center shadow-2xl shadow-[hsl(14,100%,57%)]/30">
          <Truck className="w-12 h-12 text-white" />
        </div>
      </motion.div>

      <motion.div
        animate={{ y: [0, -10, 0] }}
        transition={{ repeat: Infinity, duration: 3.5, ease: 'easeInOut', delay: 1.2 }}
        className="absolute top-12 right-16"
      >
        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[hsl(40,100%,49%)] to-[hsl(14,100%,57%)] flex items-center justify-center shadow-xl shadow-[hsl(40,100%,49%)]/25">
          <Utensils className="w-7 h-7 text-white" />
        </div>
      </motion.div>

      <h3 className="text-2xl font-bold text-gray-900 mb-2 relative">No listings found here yet</h3>
      <p className="text-gray-600 text-center max-w-sm mb-6 text-sm relative">
        Try expanding your search area or adjusting filters. Or get notified when new listings appear!
      </p>

      {/* Email signup */}
      {!isSubmitted ? (
        <form onSubmit={handleSubmit} className="relative w-full max-w-sm mb-6">
          <div className="flex items-center gap-2 p-1.5 rounded-xl bg-white border border-gray-200 shadow-lg">
            <Bell className="w-4 h-4 text-gray-400 ml-2 shrink-0" />
            <Input
              type="email"
              placeholder="Enter your email for alerts"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="border-0 shadow-none h-9 text-sm focus-visible:ring-0 px-1"
            />
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className="rounded-lg bg-gray-900 text-white hover:bg-gray-800 text-xs font-semibold px-4 shrink-0"
            >
              {isSubmitting ? 'Saving...' : 'Notify Me'}
            </Button>
          </div>
          <p className="text-[11px] text-gray-400 text-center mt-2">
            We'll email you when listings match your search. Unsubscribe anytime.
          </p>
        </form>
      ) : (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative flex items-center gap-2 mb-6 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700"
        >
          <CheckCircle className="w-5 h-5 shrink-0" />
          <span className="text-sm font-medium">You're all set! We'll notify you when new listings appear.</span>
        </motion.div>
      )}

      <div className="flex gap-3 relative">
        <Button variant="outline" onClick={onClearFilters} className="rounded-xl bg-white/70 backdrop-blur border-gray-200 hover:bg-white text-gray-900">
          <X className="w-4 h-4 mr-1" /> Clear Filters
        </Button>
      </div>
    </div>
  );
};
