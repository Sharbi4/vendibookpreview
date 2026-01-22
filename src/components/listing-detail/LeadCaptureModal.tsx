import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Mail, User, Phone, CheckCircle2, Send } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { trackFormSubmit } from '@/lib/analytics';
import { z } from 'zod';

const leadSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  name: z.string().optional(),
  phone: z.string().optional(),
  message: z.string().optional(),
});

interface LeadCaptureModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listingId: string;
  hostId: string;
  listingTitle: string;
}

export const LeadCaptureModal = ({
  open,
  onOpenChange,
  listingId,
  hostId,
  listingTitle,
}: LeadCaptureModalProps) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    phone: '',
    message: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = leadSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as string] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase.from('listing_leads').insert({
        listing_id: listingId,
        host_id: hostId,
        email: formData.email.trim(),
        name: formData.name.trim() || null,
        phone: formData.phone.trim() || null,
        message: formData.message.trim() || null,
        source: 'request_info',
      });

      if (error) throw error;

      trackFormSubmit('lead_capture', true, { listing_id: listingId });
      setIsSubmitted(true);
      
      toast({
        title: 'Request sent!',
        description: "We'll be in touch with you shortly.",
      });
    } catch (error) {
      console.error('Error submitting lead:', error);
      trackFormSubmit('lead_capture', false, { listing_id: listingId, error: String(error) });
      toast({
        title: 'Something went wrong',
        description: 'Please try again or contact support.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    // Reset after animation
    setTimeout(() => {
      setIsSubmitted(false);
      setFormData({ email: '', name: '', phone: '', message: '' });
      setErrors({});
    }, 300);
  };

  if (isSubmitted) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
              <CheckCircle2 className="h-8 w-8 text-emerald-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Request Sent!</h3>
            <p className="text-muted-foreground mb-6 max-w-xs">
              Thanks for your interest! Our team will reach out to you at <strong>{formData.email}</strong> shortly.
            </p>
            <Button onClick={handleClose} variant="dark-shine">
              Got it
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Request Info</DialogTitle>
          <DialogDescription>
            Get more details about <span className="font-medium text-foreground">{listingTitle}</span>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label htmlFor="email" className="flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5" />
              Email <span className="text-destructive">*</span>
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className={errors.email ? 'border-destructive' : ''}
              required
            />
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="name" className="flex items-center gap-1.5">
                <User className="h-3.5 w-3.5" />
                Name
              </Label>
              <Input
                id="name"
                type="text"
                placeholder="Your name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone" className="flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5" />
                Phone
              </Label>
              <Input
                id="phone"
                type="tel"
                placeholder="(555) 123-4567"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Message (optional)</Label>
            <Textarea
              id="message"
              placeholder="Questions about this listing..."
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              rows={3}
            />
          </div>

          <Button
            type="submit"
            variant="dark-shine"
            className="w-full h-11"
            disabled={isSubmitting || !formData.email}
          >
            {isSubmitting ? (
              'Sending...'
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Send Request
              </>
            )}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            By submitting, you agree to be contacted about this listing.
          </p>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default LeadCaptureModal;
