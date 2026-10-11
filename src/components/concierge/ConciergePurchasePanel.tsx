import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import ConciergeTerms from '@/components/concierge/ConciergeTerms';
import {
  type ConciergeConfig,
  createConciergeOrder,
  fetchConciergeConfig,
} from '@/lib/concierge/api';
import { formatUsd } from '@/lib/monetization/products';

/**
 * Purchase entry point for the Listing Concierge. Sign-in is required before
 * payment, and the gateway selection is preserved through the auth detour.
 * Creating the order is idempotent — a refresh never makes a second order.
 */
const ConciergePurchasePanel = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [config, setConfig] = useState<ConciergeConfig | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void fetchConciergeConfig().then(setConfig);
  }, []);

  if (!config) {
    return (
      <div className="rounded-2xl border border-border/60 p-6">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!config.is_available) {
    return (
      <div className="rounded-2xl border border-border/60 bg-muted/30 p-6 text-sm text-muted-foreground">
        The Listing Concierge is fully booked right now. You can publish a free listing yourself and
        request concierge help later.
      </div>
    );
  }

  const start = async () => {
    if (!user) {
      navigate('/auth?redirect=/list/concierge');
      return;
    }
    setBusy(true);
    try {
      const { order } = await createConciergeOrder(`concierge:${config.terms_version}`);
      navigate(`/list/concierge/${order.id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not start your order.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <ConciergeTerms config={config} accepted={accepted} onAcceptedChange={setAccepted} />
      <Button onClick={start} disabled={!accepted || busy} className="w-full sm:w-auto">
        {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Continue — {formatUsd(config.price_cents)}
      </Button>
      <p className="text-xs text-muted-foreground">
        You’ll pay securely with PayPal on the next screen. Nothing is charged until you confirm.
      </p>
    </div>
  );
};

export default ConciergePurchasePanel;
