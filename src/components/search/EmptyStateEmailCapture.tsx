import { useState } from 'react';
import { motion } from 'framer-motion';
import { Bell, CheckCircle, Truck, Utensils, X, MapPin, User, Phone } from 'lucide-react';
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
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [zipCode, setZipCode] = useState(locationText || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedEmail = email.trim();
    const trimmedName = name.trim();
    const trimmedPhone = phone.trim();
    const trimmedZip = zipCode.trim();
    
    if (!trimmedEmail || !trimmedZip || !trimmedName) {
      toast.error('Please enter your name, email, and zip code.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      toast.error('Please enter a valid email address.');
      return;
    }

    if (trimmedZip.length < 3 || trimmedZip.length > 10) {
      toast.error('Please enter a valid zip code or city.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Save to availability_alerts table
      const { error: dbError } = await supabase.from('availability_alerts').insert({
        email: trimmedEmail,
        zip_code: trimmedZip,
        category: category || null,
        mode: mode || null,
        radius_miles: 50,
      });

      if (dbError && dbError.code !== '23505') {
        console.error('DB alert error:', dbError);
      }

      // Submit to Zendesk via edge function
      try {
        const modeLabel = mode === 'rent' ? 'Rental' : mode === 'sale' ? 'Purchase' : 'Rental/Purchase';
        const categoryLabel = category ? category.replace(/_/g, ' ') : 'Any category';
        
        await supabase.functions.invoke('create-zendesk-ticket', {
          body: {
            requester_name: trimmedName,
            requester_email: trimmedEmail,
            subject: `Availability Alert: ${modeLabel} near ${trimmedZip}`,
            description: [
              `A visitor wants to be notified about new listings.`,
              ``,
              `Name: ${trimmedName}`,
              `Email: ${trimmedEmail}`,
              `Phone: ${trimmedPhone || 'Not provided'}`,
              `Zip Code / Area: ${trimmedZip}`,
              `Interest: ${modeLabel}`,
              `Category: ${categoryLabel}`,
              ``,
              `This lead came from the empty search results page.`,
            ].join('\n'),
            priority: 'normal',
            type: 'task',
            tags: ['availability-alert', 'lead', mode || 'any-mode'],
          },
        });
      } catch (zendeskErr) {
        // Non-blocking — DB save was the primary action
        console.error('Zendesk ticket error:', zendeskErr);
      }

      setIsSubmitted(true);
      toast.success("You're all set! We'll notify you when listings appear in your area.");
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

      <h3 className="text-2xl font-bold text-foreground mb-2 relative">No listings found here yet</h3>
      <p className="text-muted-foreground text-center max-w-sm mb-6 text-sm relative">
        Enter your name, email, and zip code — we'll notify you as soon as rentals or listings become available in your area.
      </p>

      {/* Form */}
      {!isSubmitted ? (
        <form onSubmit={handleSubmit} className="relative w-full max-w-md mb-6 space-y-3">
          {/* Name */}
          <div className="flex items-center gap-2 p-1.5 rounded-xl bg-background border border-border shadow-lg">
            <User className="w-4 h-4 text-muted-foreground ml-2 shrink-0" />
            <Input
              type="text"
              placeholder="Your name *"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={100}
              className="border-0 shadow-none h-9 text-sm focus-visible:ring-0 px-1"
            />
          </div>
          {/* Zip Code */}
          <div className="flex items-center gap-2 p-1.5 rounded-xl bg-background border border-border shadow-lg">
            <MapPin className="w-4 h-4 text-muted-foreground ml-2 shrink-0" />
            <Input
              type="text"
              placeholder="Your zip code or city *"
              value={zipCode}
              onChange={(e) => setZipCode(e.target.value)}
              required
              maxLength={50}
              className="border-0 shadow-none h-9 text-sm focus-visible:ring-0 px-1"
            />
          </div>
          {/* Email */}
          <div className="flex items-center gap-2 p-1.5 rounded-xl bg-background border border-border shadow-lg">
            <Bell className="w-4 h-4 text-muted-foreground ml-2 shrink-0" />
            <Input
              type="email"
              placeholder="Your email *"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              maxLength={255}
              className="border-0 shadow-none h-9 text-sm focus-visible:ring-0 px-1"
            />
          </div>
          {/* Phone (optional) */}
          <div className="flex items-center gap-2 p-1.5 rounded-xl bg-background border border-border shadow-lg">
            <Phone className="w-4 h-4 text-muted-foreground ml-2 shrink-0" />
            <Input
              type="tel"
              placeholder="Phone (optional)"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              maxLength={20}
              className="border-0 shadow-none h-9 text-sm focus-visible:ring-0 px-1"
            />
          </div>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-xl bg-foreground text-background hover:bg-foreground/90 font-semibold h-11"
          >
            {isSubmitting ? 'Saving...' : 'Notify Me'}
          </Button>
          <p className="text-[11px] text-muted-foreground text-center">
            We'll email you when listings match your area. Unsubscribe anytime.
          </p>
        </form>
      ) : (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative flex items-center gap-2 mb-6 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700"
        >
          <CheckCircle className="w-5 h-5 shrink-0" />
          <span className="text-sm font-medium">You're all set! We'll notify you when new listings appear in your area.</span>
        </motion.div>
      )}

      <div className="flex gap-3 relative">
        <Button variant="outline" onClick={onClearFilters} className="rounded-xl bg-white/70 backdrop-blur border-border hover:bg-white text-foreground">
          <X className="w-4 h-4 mr-1" /> Clear Filters
        </Button>
      </div>
    </div>
  );
};
