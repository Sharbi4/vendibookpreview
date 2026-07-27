import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Loader2, ArrowRight, Check } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { MiniPlansComparison } from '@/components/monetization/MiniPlansComparison';
import { StripeTrustBadge } from '@/components/trust/StripeTrustBadge';
import heroBg from '@/assets/hero-hosttools-bg.jpg';

/**
 * Post-signup welcome. Never blocks. Shown once — we set
 * profiles.onboarded_at on any exit (continue / see memberships).
 *
 * Copy rule: the phrase "Listing is always free" must appear.
 * No silent-dismiss X: user must explicitly Continue Free or See Members.
 * Sticky action footer keeps the primary CTA visible while plan content scrolls.
 * Respects prefers-reduced-motion via CSS transitions only.
 */

type Selection = 'free' | 'members';

const Welcome: React.FC = () => {
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();
  const [params] = useSearchParams();
  const [saving, setSaving] = useState(false);
  const [selection, setSelection] = useState<Selection>('free');
  const firstFocusRef = useRef<HTMLButtonElement | null>(null);

  const returnTo = useMemo(() => {
    const raw = params.get('returnTo') || '';
    return raw.startsWith('/') && !raw.startsWith('//') ? raw : '/dashboard';
  }, [params]);

  useEffect(() => {
    if (!isLoading && !user) navigate('/auth');
  }, [user, isLoading, navigate]);

  // Focus trap: move focus to the primary CTA on mount for keyboard users.
  useEffect(() => {
    firstFocusRef.current?.focus();
  }, []);

  const markOnboarded = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await supabase
        .from('profiles')
        .update({ onboarded_at: new Date().toISOString() })
        .eq('id', user.id);
    } catch {
      // Non-blocking: welcome dismissal is a UX nicety, not critical.
    } finally {
      setSaving(false);
    }
  };

  const handleContinueFree = async () => {
    await markOnboarded();
    navigate(returnTo, { replace: true });
  };

  const handleSeeMemberships = async () => {
    await markOnboarded();
    navigate(`/pricing?from=welcome&returnTo=${encodeURIComponent(returnTo)}`);
  };

  const handlePrimary = () => {
    if (selection === 'free') return handleContinueFree();
    return handleSeeMemberships();
  };

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-title"
      className="min-h-screen w-full obsidian-scrim flex items-start md:items-center justify-center px-3 sm:px-4 py-6 md:py-10"
    >
      <div
        className="relative w-full max-w-3xl obsidian-panel obsidian-shine overflow-hidden animate-in fade-in-0 zoom-in-95 duration-200"
      >
        {/* Hero band — real photography, no AI artwork */}
        <div className="relative h-40 sm:h-48 md:h-56 w-full overflow-hidden">
          <img
            src={heroBg}
            alt=""
            aria-hidden
            className="absolute inset-0 h-full w-full object-cover"
            draggable={false}
          />
          <div
            aria-hidden
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(180deg, rgba(6,6,8,0.15) 0%, rgba(6,6,8,0.55) 55%, rgba(6,6,8,0.95) 100%)',
            }}
          />
          <div className="absolute inset-x-0 bottom-0 p-5 sm:p-7">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70 mb-2">
              Welcome to Vendibook
            </p>
            <h1
              id="welcome-title"
              className="font-display text-2xl sm:text-3xl md:text-4xl font-semibold text-white leading-tight"
            >
              Listing is always free.
            </h1>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-7 space-y-6 max-h-[60vh] overflow-y-auto">
          <p className="text-sm sm:text-base text-white/75 leading-relaxed">
            Publish a listing at no cost, forever. Memberships are optional boosts — they help
            you grow faster with more tools and better placement. Choose your path below.
          </p>

          {/* Two-option selector: Free vs Members */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" role="radiogroup" aria-label="Choose your starting plan">
            <button
              type="button"
              role="radio"
              aria-checked={selection === 'free'}
              onClick={() => setSelection('free')}
              className={cn(
                'obsidian-panel-interactive text-left p-4 flex flex-col gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60',
                selection === 'free' && 'obsidian-selected',
              )}
            >
              <div className="flex items-center justify-between">
                <span className="font-display text-lg text-white font-semibold">Free</span>
                <span className="text-xs text-white/60">$0 forever</span>
              </div>
              <p className="text-xs text-white/70 leading-relaxed">
                Publish your listing, take bookings, and receive payments. Upgrade any time — or never.
              </p>
              <div className="mt-1 flex items-center gap-1.5 text-[11px] text-emerald-400/90">
                <Check className="h-3 w-3" /> No card required
              </div>
            </button>

            <button
              type="button"
              role="radio"
              aria-checked={selection === 'members'}
              onClick={() => setSelection('members')}
              className={cn(
                'obsidian-panel-interactive text-left p-4 flex flex-col gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 relative',
                selection === 'members' && 'obsidian-selected',
              )}
            >
              <span className="absolute -top-2 right-4 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold px-2 py-0.5 shadow-sm">
                Recommended
              </span>
              <div className="flex items-center justify-between">
                <span className="font-display text-lg text-white font-semibold">See member benefits</span>
                <span className="text-xs text-white/60">From $39/mo</span>
              </div>
              <p className="text-xs text-white/70 leading-relaxed">
                Priority placement, Spark AI tools, and featured credit. Cancel anytime.
              </p>
              <div className="mt-1 flex items-center gap-1.5 text-[11px] text-white/70">
                <Check className="h-3 w-3" /> Compare plans on the next screen
              </div>
            </button>
          </div>

          {/* Comparison — retained but framed inside the obsidian system */}
          <div className="rounded-xl overflow-hidden ring-1 ring-white/10">
            <MiniPlansComparison compact />
          </div>

          <p className="text-[11px] text-white/50 text-center">
            You can upgrade any time — or never.{' '}
            <Link to="/pricing" className="underline hover:text-white/80">
              Learn more about memberships
            </Link>
            .
          </p>
        </div>

        {/* Sticky action footer — always visible, safe-area aware on mobile */}
        <div
          className="sticky bottom-0 left-0 right-0 border-t-2 border-white/10 obsidian-surface p-4 sm:p-5"
          style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0))' }}
        >
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:justify-between">
            <div className="text-xs text-white/70">
              {selection === 'free'
                ? 'You selected Free. You can upgrade any time.'
                : "You'll see full member benefits and pricing next."}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="lg"
                onClick={selection === 'free' ? handleSeeMemberships : handleContinueFree}
                disabled={saving}
                className="text-white/80 hover:text-white hover:bg-white/5"
              >
                {selection === 'free' ? 'See member benefits' : 'Continue with Free'}
              </Button>
              <Button
                ref={firstFocusRef}
                size="lg"
                onClick={handlePrimary}
                disabled={saving}
                className="min-w-[180px] gap-2 shadow-cta-primary bg-cta-primary text-white"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    {selection === 'free' ? 'Continue to Dashboard' : 'See Member Benefits'}
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-center">
            <StripeTrustBadge context="combined" surface="dark" size="sm" />
          </div>
        </div>
      </div>
    </div>
  );
};

// Local cn to avoid an extra import churn.
function cn(...args: Array<string | false | null | undefined>) {
  return args.filter(Boolean).join(' ');
}

export default Welcome;
