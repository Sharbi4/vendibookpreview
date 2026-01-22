import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ValidatedInput, useFormValidation, validators } from '@/components/ui/validated-input';
import { Phone, Sparkles, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface WhiteGlovePopupProps {
  delayMs?: number;
}

export const WhiteGlovePopup = ({ delayMs = 15000 }: WhiteGlovePopupProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const form = useFormValidation({
    initialValues: {
      name: '',
      restaurantName: '',
      phone: '',
    },
    validators: {
      name: validators.compose(
        validators.required('Please enter your name'),
        validators.minLength(2, 'Name must be at least 2 characters')
      ),
      restaurantName: validators.compose(
        validators.required('Please enter your restaurant name'),
        validators.minLength(2, 'Restaurant name must be at least 2 characters')
      ),
      phone: validators.compose(
        validators.required('Please enter your phone number'),
        validators.phone('Please enter a valid phone number')
      ),
    },
  });

  useEffect(() => {
    // Check if user has already dismissed or submitted
    const hasInteracted = sessionStorage.getItem('whiteGlovePopupInteracted');
    if (hasInteracted) return;

    const timer = setTimeout(() => {
      setIsOpen(true);
    }, delayMs);

    return () => clearTimeout(timer);
  }, [delayMs]);

  const handleClose = () => {
    setIsOpen(false);
    sessionStorage.setItem('whiteGlovePopupInteracted', 'true');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form.validateAll()) return;

    setIsSubmitting(true);

    try {
      // Send to edge function for callback scheduling
      const { error } = await supabase.functions.invoke('schedule-callback', {
        body: {
          name: form.values.name,
          phone: form.values.phone,
          restaurantName: form.values.restaurantName,
          source: 'white-glove-kitchen-popup',
          preferredTime: 'asap',
        },
      });

      if (error) throw error;

      setIsSuccess(true);
      sessionStorage.setItem('whiteGlovePopupInteracted', 'true');
      toast.success('Request submitted! Our team will call you soon.');
      
      // Close after showing success
      setTimeout(() => {
        setIsOpen(false);
      }, 3000);
    } catch (error) {
      console.error('Failed to submit white glove request:', error);
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden">
        {/* Header with gradient */}
        <div className="bg-gradient-to-r from-primary to-primary/80 p-6 text-primary-foreground">
          <button
            onClick={handleClose}
            className="absolute right-4 top-4 text-primary-foreground/80 hover:text-primary-foreground transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
          
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-primary-foreground/20 rounded-full">
              <Sparkles className="h-5 w-5" />
            </div>
            <span className="text-sm font-medium uppercase tracking-wide opacity-90">
              White Glove Service
            </span>
          </div>
          
          <DialogHeader className="text-left space-y-2">
            <DialogTitle className="text-2xl font-bold text-primary-foreground">
              Too Busy to Set Up a Listing?
            </DialogTitle>
            <DialogDescription className="text-primary-foreground/90 text-base">
              Enter your details below and our Onboarding Team will call you to build your listing for you—free of charge.
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Form */}
        <div className="p-6">
          {isSuccess ? (
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Phone className="h-8 w-8 text-emerald-600" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                We'll Call You Soon!
              </h3>
              <p className="text-muted-foreground text-sm">
                Our onboarding team will reach out within 1 business day.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <ValidatedInput
                label="Your Name"
                value={form.values.name}
                onChange={(value) => form.setValue('name', value)}
                onBlur={() => form.setTouched('name')}
                error={form.errors.name}
                touched={form.touched.has('name')}
                placeholder="John Smith"
                required
              />

              <ValidatedInput
                label="Restaurant Name"
                value={form.values.restaurantName}
                onChange={(value) => form.setValue('restaurantName', value)}
                onBlur={() => form.setTouched('restaurantName')}
                error={form.errors.restaurantName}
                touched={form.touched.has('restaurantName')}
                placeholder="The Golden Spoon"
                required
              />

              <ValidatedInput
                label="Phone Number"
                value={form.values.phone}
                onChange={(value) => form.setValue('phone', value)}
                onBlur={() => form.setTouched('phone')}
                error={form.errors.phone}
                touched={form.touched.has('phone')}
                placeholder="(555) 123-4567"
                formatPhone
                required
              />

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-6 text-base dark-shine"
              >
                {isSubmitting ? 'Submitting...' : 'Build My Listing for Me'}
              </Button>

              <p className="text-xs text-muted-foreground text-center">
                100% free. No obligation. We just want to help you earn.
              </p>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
