import { useState } from 'react';
import { Send, Loader2, CheckCircle2, X, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { trackEventToDb } from '@/hooks/useAnalyticsEvents';
import { toast } from 'sonner';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';

const matchSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  email: z.string().trim().email("Invalid email").max(255),
  phone: z.string().trim().min(1, "Phone is required").max(20),
  zipCode: z.string().trim().min(3, "Zip code is required").max(10),
  intent: z.enum(['rent', 'buy', 'sell', 'host'], { required_error: "Please select an option" }),
});

type MatchFormData = z.infer<typeof matchSchema>;

const INTENT_OPTIONS = [
  { value: 'rent' as const, label: 'Rent', emoji: '🔑' },
  { value: 'buy' as const, label: 'Buy', emoji: '🛒' },
  { value: 'sell' as const, label: 'Sell', emoji: '💰' },
  { value: 'host' as const, label: 'Host', emoji: '📍' },
];

interface TicketFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TicketFormDialog = ({ open, onOpenChange }: TicketFormDialogProps) => {
  const [formData, setFormData] = useState<MatchFormData>({
    name: '',
    email: '',
    phone: '',
    zipCode: '',
    intent: 'rent',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof MatchFormData, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleChange = (field: keyof MatchFormData) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = matchSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Partial<Record<keyof MatchFormData, string>> = {};
      result.error.errors.forEach(err => {
        const field = err.path[0] as keyof MatchFormData;
        fieldErrors[field] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase.functions.invoke('vapi-outbound-call', {
        body: { name: result.data.name, phone: result.data.phone },
      });

      if (error) throw error;

      setIsSuccess(true);
      trackEventToDb('match_me_submit', 'conversion', { intent: result.data.intent, zip: result.data.zipCode });
      toast.success("We'll match you with the perfect listing!");

      setTimeout(() => {
        resetAndClose();
      }, 2500);
    } catch (err) {
      console.error('Match form error:', err);
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetAndClose = () => {
    setFormData({ name: '', email: '', phone: '', zipCode: '', intent: 'rent' });
    setErrors({});
    setIsSuccess(false);
    onOpenChange(false);
  };

  const handleClose = () => {
    if (!isSubmitting) resetAndClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={handleClose}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

          {/* Glass Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            onClick={e => e.stopPropagation()}
            className="relative w-full max-w-md rounded-t-2xl sm:rounded-3xl border border-white/20 shadow-2xl overflow-hidden max-h-[85vh] overflow-y-auto"
            style={{
              background: 'rgba(20, 20, 20, 0.85)',
              backdropFilter: 'blur(40px) saturate(180%)',
              WebkitBackdropFilter: 'blur(40px) saturate(180%)',
            }}
          >
            {/* Inner glow */}
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white/10 via-transparent to-transparent pointer-events-none" />

            {/* Close button */}
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="relative p-4 sm:p-8">
              {isSuccess ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center justify-center py-8 text-center"
                >
                  <div className="w-16 h-16 rounded-full bg-green-500/20 border border-green-400/30 flex items-center justify-center mb-4">
                    <CheckCircle2 className="w-8 h-8 text-green-400" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">You're Matched!</h3>
                  <p className="text-white/60 text-sm">
                    Our team will reach out within 2 hours with personalized options.
                  </p>
                </motion.div>
              ) : (
                <>
                  {/* Header */}
                   <div className="text-center mb-3 sm:mb-6">
                    <div
                      className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-amber-400/30 text-amber-400 text-[10px] sm:text-xs font-semibold uppercase tracking-wider mb-2 sm:mb-3"
                      style={{ background: 'rgba(245, 158, 11, 0.15)' }}
                    >
                      <Sparkles className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                      Free Concierge
                    </div>
                    <h2 className="text-xl sm:text-2xl font-bold text-white">Match Me</h2>
                    <p className="text-white/50 text-xs sm:text-sm mt-0.5">Tell us what you need — we'll find it for you.</p>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
                    {/* Intent selector */}
                    <div className="space-y-2">
                      <Label className="text-white/70 text-sm">I'm looking to *</Label>
                      <div className="grid grid-cols-4 gap-2">
                        {INTENT_OPTIONS.map(option => (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => {
                              setFormData(prev => ({ ...prev, intent: option.value }));
                              if (errors.intent) setErrors(prev => ({ ...prev, intent: undefined }));
                            }}
                            className={`flex flex-col items-center gap-0.5 py-2 sm:py-3 rounded-xl border text-xs sm:text-sm font-medium transition-all ${
                              formData.intent === option.value
                                ? 'border-primary bg-primary/20 text-white shadow-lg shadow-primary/20'
                                : 'border-white/10 text-white/60 hover:border-white/20 hover:bg-white/5'
                            }`}
                          >
                            <span className="text-base sm:text-lg">{option.emoji}</span>
                            <span>{option.label}</span>
                          </button>
                        ))}
                      </div>
                      {errors.intent && <p className="text-xs text-red-400">{errors.intent}</p>}
                    </div>

                    {/* Name */}
                    <div className="space-y-1.5">
                      <Label className="text-white/70 text-sm">Full Name *</Label>
                      <Input
                        placeholder="John Doe"
                        value={formData.name}
                        onChange={handleChange('name')}
                        disabled={isSubmitting}
                        className={`bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-primary/50 ${errors.name ? 'border-red-400/50' : ''}`}
                      />
                      {errors.name && <p className="text-xs text-red-400">{errors.name}</p>}
                    </div>

                    {/* Email & Phone */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-white/70 text-sm">Email *</Label>
                        <Input
                          type="email"
                          placeholder="you@email.com"
                          value={formData.email}
                          onChange={handleChange('email')}
                          disabled={isSubmitting}
                          className={`bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-primary/50 ${errors.email ? 'border-red-400/50' : ''}`}
                        />
                        {errors.email && <p className="text-xs text-red-400">{errors.email}</p>}
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-white/70 text-sm">Phone *</Label>
                        <Input
                          type="tel"
                          placeholder="(555) 123-4567"
                          value={formData.phone}
                          onChange={handleChange('phone')}
                          disabled={isSubmitting}
                          className={`bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-primary/50 ${errors.phone ? 'border-red-400/50' : ''}`}
                        />
                        {errors.phone && <p className="text-xs text-red-400">{errors.phone}</p>}
                      </div>
                    </div>

                    {/* Zip Code */}
                    <div className="space-y-1.5">
                      <Label className="text-white/70 text-sm">Zip Code *</Label>
                      <Input
                        placeholder="10001"
                        value={formData.zipCode}
                        onChange={handleChange('zipCode')}
                        disabled={isSubmitting}
                        className={`bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-primary/50 ${errors.zipCode ? 'border-red-400/50' : ''}`}
                      />
                      {errors.zipCode && <p className="text-xs text-red-400">{errors.zipCode}</p>}
                    </div>

                    {/* Submit */}
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full h-10 sm:h-12 rounded-full bg-black text-white hover:bg-gray-800 font-semibold shadow-lg text-sm sm:text-base"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4 mr-2" />
                          Match Me
                        </>
                      )}
                    </Button>

                    <p className="text-center text-white/30 text-xs">
                      No bots. A real human will follow up within 2 hours.
                    </p>
                  </form>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default TicketFormDialog;
