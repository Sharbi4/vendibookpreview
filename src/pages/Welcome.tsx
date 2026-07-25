import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Loader2, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { MiniPlansComparison } from '@/components/monetization/MiniPlansComparison';

/**
 * Post-signup welcome. Never blocks. Shown once — we set
 * profiles.onboarded_at on any exit (continue / see memberships / dismiss).
 *
 * Copy rule: the phrase "Listing is always free" must appear.
 * No pre-selected paid option. Close button is a visible X, not disguised.
 */
const Welcome: React.FC = () => {
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();
  const [params] = useSearchParams();
  const [saving, setSaving] = useState(false);

  const returnTo = useMemo(() => {
    const raw = params.get('returnTo') || '';
    return raw.startsWith('/') && !raw.startsWith('//') ? raw : '/dashboard';
  }, [params]);

  useEffect(() => {
    if (!isLoading && !user) navigate('/auth');
  }, [user, isLoading, navigate]);

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

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-start justify-center py-10 px-4">
      <div className="w-full max-w-2xl rounded-lg border border-border bg-card shadow-lg relative">
        <button
          type="button"
          aria-label="Skip welcome"
          onClick={handleContinueFree}
          className="absolute top-4 right-4 rounded-md p-2 text-muted-foreground hover:text-foreground hover:bg-muted transition"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="p-6 sm:p-8 space-y-6">
          <div className="space-y-2">
            <h1 className="font-display text-2xl sm:text-3xl font-semibold text-foreground">
              Welcome to Vendibook — listing is always free.
            </h1>
            <p className="text-muted-foreground">
              Publish a listing at no cost, forever. Memberships are optional — they just help you
              grow faster with more tools and better placement.
            </p>
          </div>

          <MiniPlansComparison />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <Button
              variant="outline"
              size="lg"
              onClick={handleContinueFree}
              disabled={saving}
              className="w-full"
            >
              Continue free
            </Button>
            <Button
              size="lg"
              onClick={handleSeeMemberships}
              disabled={saving}
              className="w-full"
            >
              See memberships
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            No card required. You can upgrade any time — or never.{' '}
            <Link to="/pricing" className="underline hover:text-foreground">
              Learn more
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
};

export default Welcome;
