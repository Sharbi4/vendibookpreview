import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useHostEntitlements } from '@/hooks/useHostEntitlements';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { MiniPlansComparison } from '@/components/monetization/MiniPlansComparison';

const LS_KEY = 'vb:mship-panel-dismissed:v1';

interface MembershipInlinePanelProps {
  /**
   * Where checkout should return the user after upgrading.
   * Should include the current wizard step so continuity is preserved.
   */
  returnTo: string;
}

/**
 * Slim, dismissible panel shown once per user inside the publish flow.
 * Never blocks publishing — "Continue free" is a full equal-weight button.
 */
export const MembershipInlinePanel: React.FC<MembershipInlinePanelProps> = ({ returnTo }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { tier } = useHostEntitlements();
  const [dismissed, setDismissed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    return window.localStorage.getItem(LS_KEY) === '1';
  });

  // Also honor the server-side dismissal flag so it stays dismissed across devices.
  useEffect(() => {
    let alive = true;
    if (dismissed || !user) return;
    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('membership_panel_dismissed_at')
        .eq('id', user.id)
        .maybeSingle();
      if (!alive) return;
      if (data?.membership_panel_dismissed_at) {
        window.localStorage.setItem(LS_KEY, '1');
        setDismissed(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, [dismissed, user]);

  // Paid members already made their choice — don't nag them.
  if (dismissed || tier !== 'free') return null;

  const persistDismiss = async () => {
    window.localStorage.setItem(LS_KEY, '1');
    setDismissed(true);
    if (user) {
      try {
        await supabase
          .from('profiles')
          .update({ membership_panel_dismissed_at: new Date().toISOString() })
          .eq('id', user.id);
      } catch {
        /* non-critical */
      }
    }
  };

  const handleUpgrade = () => {
    // Do NOT auto-dismiss — user may cancel checkout. Only dismiss on Continue free / X.
    navigate(`/pricing?returnTo=${encodeURIComponent(returnTo)}`);
  };

  return (
    <div className="relative rounded-lg border border-border/70 bg-card/80 p-5 space-y-4">
      <button
        type="button"
        aria-label="Dismiss membership panel"
        onClick={persistDismiss}
        className="absolute top-3 right-3 rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="pr-8">
        <h3 className="font-display text-lg font-semibold text-foreground">
          Publish free, or grow faster with a membership.
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          Listing is always free. Memberships add tools and better placement — they're never
          required to publish.
        </p>
      </div>

      <MiniPlansComparison compact />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Button variant="outline" onClick={persistDismiss} className="w-full">
          Continue free
        </Button>
        <Button onClick={handleUpgrade} className="w-full">
          Upgrade
        </Button>
      </div>
    </div>
  );
};

export default MembershipInlinePanel;
