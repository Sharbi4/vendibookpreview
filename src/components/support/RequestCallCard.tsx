import { useState } from 'react';
import { Phone, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const RequestCallCard = () => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const trimmedName = name.trim();
    const trimmedPhone = phone.trim();
    const digits = trimmedPhone.replace(/\D/g, '');

    if (!trimmedName) {
      setError('Please enter your name.');
      return;
    }
    if (digits.length < 10) {
      setError('Please enter a valid phone number.');
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('vapi-outbound-call', {
        body: { name: trimmedName, phone: trimmedPhone },
      });
      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);

      setIsSuccess(true);
      toast({
        title: 'Calling you now',
        description: 'Vendibook Support is dialing your number. Please answer.',
      });
    } catch (err: any) {
      console.error('Request call error:', err);
      const message = 'We couldn\'t place the call right now. Please try again in a moment or email support@vendibook.com.';
      setError(message);
      toast({
        title: 'Could not place the call',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative group h-full">
      {/* Satin aura */}
      <div className="absolute -inset-px rounded-2xl bg-gradient-to-b from-primary/25 via-white/5 to-transparent opacity-60 blur-sm pointer-events-none" />
      <div className="absolute -top-24 -right-16 w-64 h-64 rounded-full bg-primary/10 blur-3xl pointer-events-none" />

      <div className="relative h-full rounded-2xl border border-white/10 bg-[#0e0e10]/90 backdrop-blur-xl p-6 md:p-8 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.8)] overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.04),transparent_60%)] pointer-events-none" />

        {isSuccess ? (
          <div
            className="relative text-center py-4"
            role="status"
            aria-live="polite"
          >
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/15 text-primary mb-4 ring-1 ring-primary/30">
              <CheckCircle2 className="h-8 w-8" aria-hidden="true" />
            </div>
            <h3 className="text-xl font-medium text-white tracking-tight mb-1">Calling you now</h3>
            <p className="text-sm text-white/60 mb-5">
              Vendibook Support is dialing{' '}
              <span className="text-white/90 font-mono">{phone}</span>. Please answer.
            </p>
            <Button
              variant="outline"
              className="border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white"
              onClick={() => { setIsSuccess(false); setName(''); setPhone(''); setError(null); }}
            >
              Request another callback
            </Button>
          </div>
        ) : (
          <div className="relative">
            <div className="flex items-center gap-2 mb-4">
              <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-primary/15 text-primary ring-1 ring-primary/25">
                <Phone className="h-4 w-4" aria-hidden="true" />
              </span>
              <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-white/50">
                Primary support
              </span>
            </div>

            <h2 className="text-2xl md:text-[28px] font-medium tracking-tight text-white mb-2">
              Request a callback
            </h2>
            <p className="text-sm text-white/60 leading-relaxed max-w-md mb-6">
              Enter your information and Vendibook Support will call you—typically within 60 seconds.
            </p>

            <form onSubmit={handleSubmit} className="space-y-3" noValidate>
              <div className="space-y-1.5">
                <label htmlFor="req-call-name" className="font-mono text-[10px] uppercase tracking-[0.15em] text-white/40 ml-1">
                  Your name
                </label>
                <input
                  id="req-call-name"
                  name="name"
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Jane Doe"
                  disabled={isSubmitting}
                  maxLength={100}
                  required
                  aria-required="true"
                  className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-base md:text-sm text-white placeholder:text-white/25 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/50 focus:bg-white/[0.06] transition-colors"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="req-call-phone" className="font-mono text-[10px] uppercase tracking-[0.15em] text-white/40 ml-1">
                  Phone number
                </label>
                <input
                  id="req-call-phone"
                  name="phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(555) 123-4567"
                  disabled={isSubmitting}
                  maxLength={20}
                  required
                  aria-required="true"
                  aria-describedby={error ? 'req-call-error' : undefined}
                  className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-base md:text-sm text-white placeholder:text-white/25 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/50 focus:bg-white/[0.06] transition-colors"
                />
              </div>

              {error && (
                <p id="req-call-error" role="alert" className="text-xs text-red-300/90 pl-1">
                  {error}
                </p>
              )}

              <Button
                type="submit"
                disabled={isSubmitting}
                aria-disabled={isSubmitting}
                className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-medium shadow-[0_8px_30px_-8px_hsl(var(--primary)/0.6)] active:scale-[0.99] transition-all"
              >
                {isSubmitting ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" />Connecting…</>
                ) : (
                  <><Phone className="h-4 w-4 mr-2" aria-hidden="true" />Call me now</>
                )}
              </Button>

              <p className="text-[11px] text-white/40 leading-relaxed text-center px-2">
                By requesting a callback, you consent to receive a call at the number provided.
                Calls may be monitored or recorded for quality and training purposes.
              </p>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default RequestCallCard;
