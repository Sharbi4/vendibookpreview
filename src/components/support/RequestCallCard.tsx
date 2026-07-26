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

  return (
    <div className="relative group">
      {/* Satin aura */}
      <div className="absolute -inset-px rounded-2xl bg-gradient-to-b from-primary/30 via-white/5 to-transparent opacity-60 blur-sm pointer-events-none" />
      <div className="absolute -top-24 -right-16 w-64 h-64 rounded-full bg-primary/10 blur-3xl pointer-events-none" />

      <div className="relative rounded-2xl border border-white/10 bg-[#0e0e10]/90 backdrop-blur-xl p-6 md:p-8 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.8)] overflow-hidden">
        {/* Subtle satin sheen */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.04),transparent_60%)] pointer-events-none" />

        {isSuccess ? (
          <div className="relative text-center py-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/15 text-primary mb-4 ring-1 ring-primary/30">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-medium text-white tracking-tight mb-1">Calling you now</h3>
            <p className="text-sm text-white/60 mb-5">
              Our AI support agent is dialing <span className="text-white/90 font-mono">{phone}</span>. Please answer.
            </p>
            <Button
              variant="outline"
              className="border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white"
              onClick={() => { setIsSuccess(false); setName(''); setPhone(''); }}
            >
              Request another call
            </Button>
          </div>
        ) : (
          <div className="relative">
            {/* Live pill */}
            <div className="flex items-center gap-2 mb-5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
              </span>
              <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-white/50">
                Live Priority Support · Avg. under 5 min
              </span>
            </div>

            <div className="grid md:grid-cols-[1.1fr,1fr] gap-8 items-start">
              <div>
                <h2 className="text-2xl md:text-3xl font-medium tracking-tight text-white mb-2">
                  Talk to a human in 60 seconds.
                </h2>
                <p className="text-sm text-white/60 leading-relaxed max-w-md">
                  Our Support team will call your phone immediately —
                  for bookings, payouts, listings, documents, or anything in between.
                </p>
                <div className="hidden md:flex items-center gap-4 mt-6 text-[11px] text-white/40 font-mono">
                  <span className="flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-emerald-400/70" />
                    Secure
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-emerald-400/70" />
                    No hold music
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-emerald-400/70" />
                    24/7
                  </span>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="space-y-1.5">
                  <label htmlFor="req-call-name" className="font-mono text-[10px] uppercase tracking-[0.15em] text-white/40 ml-1">
                    Your Name
                  </label>
                  <input
                    id="req-call-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Jane Doe"
                    disabled={isSubmitting}
                    maxLength={100}
                    className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-base md:text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-primary/50 focus:bg-white/[0.06] transition-colors"
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="req-call-phone" className="font-mono text-[10px] uppercase tracking-[0.15em] text-white/40 ml-1">
                    Phone Number
                  </label>
                  <input
                    id="req-call-phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(555) 123-4567"
                    disabled={isSubmitting}
                    maxLength={20}
                    className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-base md:text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-primary/50 focus:bg-white/[0.06] transition-colors"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-medium shadow-[0_8px_30px_-8px_hsl(var(--primary)/0.6)] active:scale-[0.99] transition-all"
                >
                  {isSubmitting ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Connecting…</>
                  ) : (
                    <><Phone className="h-4 w-4 mr-2" />Call me now</>
                  )}
                </Button>

                <p className="text-[10px] text-white/30 text-center font-mono tracking-wide">
                  By requesting a call you consent to be contacted at the number provided. Calls may be recorded.
                </p>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RequestCallCard;
