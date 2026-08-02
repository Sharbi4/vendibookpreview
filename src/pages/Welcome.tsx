import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Loader2, ArrowRight, Check } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { MiniPlansComparison } from '@/components/monetization/MiniPlansComparison';
import { StripeTrustBadge } from '@/components/trust/StripeTrustBadge';
import { cn } from '@/lib/utils';
import heroBg from '@/assets/hero-hosttools-bg.jpg';

/**
 * Post-signup welcome. Never blocks. Persists profiles.onboarded_at on
 * successful exit — Free continues to dashboard, "Explore plans" opens /pricing.
 *
 * Semantics: this is a full route, not a modal. We use <main> landmark
 * semantics and do NOT claim role=dialog / aria-modal since there is no
 * focus trap. Escape does not dismiss silently — the user must choose.
 *
 * Copy: no hardcoded prices, features, or "Recommended" claims. The paid
 * option routes to /pricing where the authoritative catalog renders.
 */

type Selection = 'free' | 'members';

const Welcome: React.FC = () => {
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();
  const [params] = useSearchParams();
  const [saving, setSaving] = useState(false);
  const [selection, setSelection] = useState<Selection>('free');
  const primaryBtnRef = useRef<HTMLButtonElement | null>(null);

  const returnTo = useMemo(() => {
    const raw = params.get('returnTo') || '';
    return raw.startsWith('/') && !raw.startsWith('//') ? raw : '/dashboard';
  }, [params]);

  useEffect(() => {
    if (!isLoading && !user) navigate('/auth');
  }, [user, isLoading, navigate]);

  // Initial focus — not a trap. Keyboard focus flows naturally after.
  useEffect(() => {
    primaryBtnRef.current?.focus();
  }, []);

  /**
   * Persist onboarded_at. Returns true on success, false on failure so
   * callers can keep the user on Welcome and offer retry.
   */
  const markOnboarded = async (): Promise<boolean> => {
    if (!user) return false;
    const { error } = await supabase
      .from('profiles')
      .update({ onboarded_at: new Date().toISOString() })
      .eq('id', user.id);
    if (error) {
      console.error('[welcome] failed to persist onboarded_at', error);
      return false;
    }
    return true;
  };

  const withSave = async (next: () => void) => {
    setSaving(true);
    const ok = await markOnboarded();
    setSaving(false);
    if (!ok) {
      toast.error("We couldn't save your choice", {
        description: 'Please try again in a moment. Your account is fine — this is just the onboarding note.',
      });
      return;
    }
    next();
  };

  const handleContinueFree = () =>
    withSave(() => navigate(returnTo, { replace: true }));

  const handleSeeMemberships = () =>
    withSave(() =>
      navigate(`/pricing?from=welcome&returnTo=${encodeURIComponent(returnTo)}`),
    );

  const handlePrimary = () =>
    selection === 'free' ? handleContinueFree() : handleSeeMemberships();

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <main
      aria-labelledby="welcome-title"
      className="min-h-[100svh] w-full obsidian-scrim flex items-start md:items-center justify-center px-3 sm:px-4 py-6 md:py-10"
    >
      <section
        className={cn(
          'relative w-full max-w-3xl obsidian-panel obsidian-shine overflow-hidden',
          'flex flex-col max-h-[calc(100svh-3rem)]',
          'motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-95 motion-safe:duration-200',
        )}
      >
        {/* Hero band — real photography, no AI artwork */}
        <div className="relative h-40 sm:h-48 md:h-56 w-full overflow-hidden shrink-0">
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

        {/* Body — the single scroll container */}
        <div className="flex-1 min-h-0 overflow-y-auto p-5 sm:p-7 space-y-6">
          <p className="text-sm sm:text-base text-white/75 leading-relaxed">
            Publish a listing at no cost, forever. Memberships are optional — explore them
            whenever you like. Choose your path below.
          </p>

          {/* Two-option selector — neutral copy, no hardcoded pricing */}
          <div
            className="grid grid-cols-1 sm:grid-cols-2 gap-3"
            role="radiogroup"
            aria-label="Choose your starting path"
          >
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
                <span className="font-display text-lg text-white font-semibold">Start Free</span>
              </div>
              <p className="text-xs text-white/70 leading-relaxed">
                Publish your listing, take bookings, and receive payments. No card required.
              </p>
              <div className="mt-1 flex items-center gap-1.5 text-[11px] text-emerald-400/90">
                <Check className="h-3 w-3" /> Continue straight to your dashboard
              </div>
            </button>

            <button
              type="button"
              role="radio"
              aria-checked={selection === 'members'}
              onClick={() => setSelection('members')}
              className={cn(
                'obsidian-panel-interactive text-left p-4 flex flex-col gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60',
                selection === 'members' && 'obsidian-selected',
              )}
            >
              <div className="flex items-center justify-between">
                <span className="font-display text-lg text-white font-semibold">
                  Explore member plans
                </span>
              </div>
              <p className="text-xs text-white/70 leading-relaxed">
                Compare current plans and benefits. Cancel anytime.
              </p>
              <div className="mt-1 flex items-center gap-1.5 text-[11px] text-white/70">
                <Check className="h-3 w-3" /> Opens the live pricing page
              </div>
            </button>
          </div>

          {/* Live catalog — the authoritative source of plan facts */}
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

          {/* Spacer so the last row is never covered by the sticky footer */}
          <div aria-hidden className="h-2" />
        </div>

        {/* Action footer — outside body scroll, always visible */}
        <div
          className="shrink-0 border-t-2 border-white/10 obsidian-surface p-4 sm:p-5"
          style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0))' }}
        >
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:justify-between">
            <div className="text-xs text-white/70 sm:max-w-[45%]">
              {selection === 'free'
                ? 'You selected Free. You can upgrade any time.'
                : "We'll open the live pricing page next."}
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 min-w-0">
              <Button
                variant="ghost"
                size="lg"
                onClick={selection === 'free' ? handleSeeMemberships : handleContinueFree}
                disabled={saving}
                className="text-white/80 hover:text-white hover:bg-white/5"
              >
                {selection === 'free' ? 'Explore member plans' : 'Continue with Free'}
              </Button>
              <Button
                ref={primaryBtnRef}
                size="lg"
                onClick={handlePrimary}
                disabled={saving}
                className="sm:min-w-[200px] gap-2 shadow-cta-primary bg-cta-primary text-white"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    {selection === 'free' ? 'Continue to Dashboard' : 'Explore Plans'}
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-center">
            {/* Truthful context: billing is PayPal-powered. Do not imply PayPal covers
                every part of Vendibook. Badge asset already reads "Powered by PayPal" —
                no repeat copy alongside it. */}
            <StripeTrustBadge context="subscription" surface="dark" size="sm" withCopy={false} />
          </div>
        </div>
      </section>
    </main>
  );
};

export default Welcome;
