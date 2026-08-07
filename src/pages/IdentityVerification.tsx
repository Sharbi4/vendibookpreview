import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import {
  Shield,
  CheckCircle2,
  Loader2,
  Camera,
  UserRound,
  IdCard,
  Lock,
  ExternalLink,
  ArrowRight,
} from 'lucide-react';
import Header from '@/components/layout/Header';
import verifiedBadge from '@/assets/verified-badge.png';
import { PaymentTrustBadge } from '@/components/trust/PaymentTrustBadge';
import { goBackToOrigin } from '@/lib/originNav';

type Status = 'checking' | 'not_started' | 'pending' | 'processing' | 'verified';

const IdentityVerification = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<Status>('checking');
  const { user, isVerified, refreshProfile, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
      return;
    }
    if (isVerified) {
      setStatus('verified');
    } else if (user) {
      void checkStatus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading, isVerified]);

  const checkStatus = async () => {
    try {
      const { data, error } = await supabase.functions.invoke(
        'check-identity-verification',
      );
      if (error) {
        setStatus('not_started');
        return;
      }
      setStatus((data?.status as Status) || 'not_started');
      if (data?.verified) await refreshProfile();
    } catch {
      setStatus('not_started');
    }
  };

  const startVerification = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        'create-identity-verification',
      );
      if (error || !data?.url) {
        toast({
          title: 'Could not start verification',
          description: 'Please try again in a moment.',
          variant: 'destructive',
        });
        return;
      }
      window.open(data.url, '_blank');
      setStatus('pending');
      toast({
        title: 'Verification opened in a new tab',
        description: 'Finish the steps, then come back here to check status.',
      });
    } catch {
      toast({
        title: 'Something went wrong',
        description: 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading || status === 'checking') {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (status === 'verified' || isVerified) {
    return <VerifiedState onDone={() => goBackToOrigin(navigate)} />;
  }

  const isInProgress = status === 'pending' || status === 'processing';

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 flex items-start justify-center px-4 py-10 md:py-16">
        <div className="w-full max-w-xl">
          <div className="rounded-lg border border-border bg-card p-6 md:p-8 shadow-sm">
            {/* Icon + hierarchy */}
            <div className="flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 mb-5">
              <Shield className="h-7 w-7 text-primary" />
            </div>

            <h1 className="text-2xl md:text-[28px] font-semibold text-foreground leading-tight">
              Verify your identity
            </h1>
            <p className="text-foreground/70 mt-2 text-[15px] leading-relaxed">
              Verification keeps Vendibook safe for high-value sales and unlocks
              publishing.
            </p>

            {/* What to expect */}
            <ol className="mt-6 space-y-3">
              <ExpectStep
                index={1}
                icon={IdCard}
                title="Take a photo of your government ID"
              />
              <ExpectStep
                index={2}
                icon={UserRound}
                title="Take a quick selfie"
              />
              <ExpectStep
                index={3}
                icon={CheckCircle2}
                title="Get verified — usually under a minute"
              />
            </ol>

            {/* In-progress banner */}
            {isInProgress && (
              <div className="mt-6 rounded-md border border-amber-500/30 bg-amber-500/10 p-4">
                <p className="text-sm font-medium text-amber-200">
                  Verification in progress
                </p>
                <p className="text-sm text-amber-100/80 mt-1">
                  Finish the steps in the other tab, then tap below to refresh
                  your status.
                </p>
              </div>
            )}

            {/* Primary CTA */}
            <div className="mt-7 space-y-3">
              {isInProgress ? (
                <Button
                  onClick={() => {
                    setIsLoading(true);
                    void checkStatus().finally(() => setIsLoading(false));
                  }}
                  size="lg"
                  className="w-full"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  Check verification status
                </Button>
              ) : (
                <Button
                  onClick={startVerification}
                  size="lg"
                  className="w-full"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <ExternalLink className="h-4 w-4 mr-2" />
                  )}
                  Start verification
                </Button>
              )}

              <button
                type="button"
                onClick={() => goBackToOrigin(navigate)}
                className="w-full text-sm text-foreground/60 hover:text-foreground transition-colors py-2"
              >
                Skip for now
              </button>
            </div>

            {/* Trust row */}
            <div className="mt-8 pt-6 border-t border-border grid gap-4 md:grid-cols-3">
              <TrustCell
                media={
                  <PaymentTrustBadge
                    context="identity"
                    surface="light"
                    size="sm"
                    withCopy={false}
                  />
                }
                title="Powered by Vendibook identity verification"
                body="Bank-grade verification, trusted worldwide."
              />
              <TrustCell
                media={<Lock className="h-5 w-5 text-foreground/80" />}
                title="Encrypted end-to-end"
                body="Your ID is reviewed by Stripe. Vendibook never stores your document."
              />
              <TrustCell
                media={
                  <img
                    src={verifiedBadge}
                    alt="Verified"
                    className="h-6 w-6 object-contain"
                  />
                }
                title="Get a Verified badge"
                body="Buyers can see it — it earns trust and closes deals faster."
              />
            </div>

            <p className="text-[13px] text-foreground/70 mt-8 leading-relaxed text-center">
              By continuing you agree to share the information required for
              Vendibook identity verification to verify you. See our{' '}
              <a
                href="/privacy"
                className="underline underline-offset-2 hover:text-foreground"
              >
                Privacy Policy
              </a>
              .
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

const ExpectStep = ({
  index,
  icon: Icon,
  title,
}: {
  index: number;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
}) => (
  <li className="flex items-center gap-3">
    <div className="flex items-center justify-center h-8 w-8 rounded-md border border-border bg-muted/40 text-sm font-medium text-foreground/80 shrink-0">
      {index}
    </div>
    <Icon className="h-4 w-4 text-foreground/60 shrink-0" />
    <span className="text-[15px] text-foreground">{title}</span>
  </li>
);

const TrustCell = ({
  media,
  title,
  body,
}: {
  media: React.ReactNode;
  title: string;
  body: string;
}) => (
  <div className="flex flex-col gap-2">
    <div className="h-6 flex items-center">{media}</div>
    <p className="text-sm font-medium text-foreground leading-snug">{title}</p>
    <p className="text-xs text-foreground/60 leading-relaxed">{body}</p>
  </div>
);

const VerifiedState = ({ onDone }: { onDone: () => void }) => (
  <div className="min-h-screen flex flex-col bg-background">
    <Header />
    <main className="flex-1 flex items-start justify-center px-4 py-10 md:py-16">
      <div className="w-full max-w-lg rounded-lg border border-border bg-card p-6 md:p-8 shadow-sm text-center">
        <div className="mx-auto w-20 h-20 flex items-center justify-center">
          <img
            src={verifiedBadge}
            alt="Verified"
            className="h-20 w-20 object-contain"
          />
        </div>
        <h1 className="text-2xl font-semibold mt-4">You're verified</h1>
        <p className="text-foreground/70 mt-2">
          Your Verified badge is now live on your profile and listings.
        </p>

        <ul className="mt-6 text-left space-y-2 border-t border-border pt-6">
          <UnlockedRow text="Publish listings without holds" />
          <UnlockedRow text="Higher visibility in search" />
          <UnlockedRow text="Buyers see a Verified badge on your profile" />
        </ul>

        <Button onClick={onDone} size="lg" className="w-full mt-6">
          Continue
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </main>
  </div>
);

const UnlockedRow = ({ text }: { text: string }) => (
  <li className="flex items-center gap-2 text-sm text-foreground">
    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
    {text}
  </li>
);

export default IdentityVerification;

// unused import guard for tree-shakers keeping the icon in bundle
export const _kept = Camera;
