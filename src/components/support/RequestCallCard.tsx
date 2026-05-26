import { useState } from 'react';
import { Phone, Loader2, CheckCircle2, PhoneCall } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const RequestCallCard = () => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    const trimmedPhone = phone.trim();

    if (!trimmedName || !trimmedPhone) {
      toast({
        title: 'Missing information',
        description: 'Please enter your name and phone number.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('vapi-outbound-call', {
        body: { name: trimmedName, phone: trimmedPhone },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setIsSuccess(true);
      toast({
        title: 'Calling you now',
        description: 'Our support agent is dialing your number. Please answer.',
      });
    } catch (err: any) {
      console.error('Request call error:', err);
      toast({
        title: 'Could not place the call',
        description: err?.message || 'Please try again or call (725) 755-9598.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="bg-card border border-border rounded-xl p-6 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 text-primary mb-4">
          <CheckCircle2 className="h-8 w-8" />
        </div>
        <h3 className="font-semibold text-foreground mb-1">Calling you now</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Our AI support agent is dialing {phone}. Please answer your phone.
        </p>
        <Button
          variant="outline"
          onClick={() => { setIsSuccess(false); setName(''); setPhone(''); }}
        >
          Request another call
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
      <div className="flex items-start gap-3 mb-5">
        <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
          <PhoneCall className="h-6 w-6" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground">Request a call from support</h3>
          <p className="text-sm text-muted-foreground">
            Our AI support agent will call you right now to help.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="req-call-name">Your Name</Label>
            <Input
              id="req-call-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jane Doe"
              disabled={isSubmitting}
              maxLength={100}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="req-call-phone">Phone Number</Label>
            <Input
              id="req-call-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(555) 123-4567"
              disabled={isSubmitting}
              maxLength={20}
            />
          </div>
        </div>

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Connecting...</>
          ) : (
            <><Phone className="h-4 w-4 mr-2" />Call me now</>
          )}
        </Button>
      </form>
    </div>
  );
};

export default RequestCallCard;
