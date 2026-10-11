import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle2, Loader2, XCircle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Header from '@/components/layout/Header';
import verifiedBadge from '@/assets/verified-badge.png';
import { goBackToOrigin } from '@/lib/originNav';

const VerificationComplete = () => {
  const [status, setStatus] = useState<'checking' | 'verified' | 'failed'>(
    'checking',
  );
  const { refreshProfile, user, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      navigate('/auth');
      return;
    }

    const check = async () => {
      const pull = async (action: 'refresh' | 'status') => {
        const { data, error } = await supabase.functions.invoke('verified-seller', {
          body: { action },
        });
        if (error) return null;
        return data as { badge_active?: boolean } | null;
      };

      try {
        const data = await pull('refresh');
        if (data?.badge_active) {
          await refreshProfile();
          setStatus('verified');
          return;
        }
        // Retry once — the provider often needs a beat to settle.
        setTimeout(async () => {
          const retry = await pull('status');
          if (retry?.badge_active) {
            await refreshProfile();
            setStatus('verified');
          } else {
            setStatus('failed');
          }
        }, 2000);
      } catch {
        setStatus('failed');
      }
    };
    void check();
  }, [user, isLoading, navigate, refreshProfile]);

  if (status === 'checking') {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 flex items-center justify-center px-4">
          <div className="text-center">
            <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-foreground">
              Checking your verification…
            </h2>
            <p className="text-foreground/70 mt-2 text-sm">
              This usually takes just a few seconds.
            </p>
          </div>
        </main>
      </div>
    );
  }

  if (status === 'verified') {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 flex items-start justify-center px-4 py-10 md:py-16">
          <div className="w-full max-w-lg rounded-lg border border-border bg-card p-6 md:p-8 shadow-sm text-center">
            <img
              src={verifiedBadge}
              alt="Verified"
              className="h-20 w-20 object-contain mx-auto"
            />
            <h1 className="text-2xl font-semibold text-foreground mt-4">
              You're verified
            </h1>
            <p className="text-foreground/70 mt-2 text-[15px]">
              Your Verified badge is now live. Here's what you just unlocked.
            </p>

            <ul className="mt-6 space-y-2 border-t border-border pt-6 text-left">
              {[
                'Publish listings without holds',
                'Higher visibility in search results',
                'Verified badge on your profile buyers can see',
              ].map((text) => (
                <li
                  key={text}
                  className="flex items-center gap-2 text-sm text-foreground"
                >
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  {text}
                </li>
              ))}
            </ul>

            <Button
              onClick={() => goBackToOrigin(navigate)}
              size="lg"
              className="w-full mt-6"
            >
              Continue
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 flex items-start justify-center px-4 py-10 md:py-16">
        <div className="w-full max-w-lg rounded-lg border border-border bg-card p-6 md:p-8 shadow-sm text-center">
          <div className="mx-auto h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <XCircle className="h-8 w-8 text-destructive" />
          </div>
          <h1 className="text-2xl font-semibold text-foreground mt-4">
            Verification not complete
          </h1>
          <p className="text-foreground/70 mt-2 text-[15px]">
            We couldn't confirm your ID yet. You can try again or return to
            where you were.
          </p>
          <div className="mt-6 flex flex-col gap-2">
            <Button
              onClick={() => navigate('/verify-identity')}
              size="lg"
              className="w-full"
            >
              Try again
            </Button>
            <button
              type="button"
              onClick={() => goBackToOrigin(navigate)}
              className="w-full text-sm text-foreground/60 hover:text-foreground transition-colors py-2"
            >
              Go back
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default VerificationComplete;
