import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, Compass, Loader2, Search, Store, Truck } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import logo from '@/assets/vendibook-wordmark-light.png';
import { cn } from '@/lib/utils';

type Intent = 'buy' | 'rent' | 'sell' | 'explore';

const OPTIONS: { key: Intent; label: string; hint: string; icon: typeof Search }[] = [
  { key: 'buy', label: 'Buy a truck or trailer', hint: 'Browse trucks, trailers, and mobile kitchens for sale', icon: Truck },
  { key: 'rent', label: 'Rent an asset or space', hint: 'Find rentals, commissary kitchens, and vendor spaces', icon: Search },
  { key: 'sell', label: 'Sell or rent out an asset', hint: 'Create a listing and reach qualified buyers', icon: Store },
  { key: 'explore', label: 'Just exploring', hint: 'Look around — nothing to set up yet', icon: Compass },
];

export default function WorkspaceOnboarding() {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const [selected, setSelected] = useState<Intent[]>([]);
  const [saving, setSaving] = useState(false);

  const returnTo = useMemo(() => {
    const raw = params.get('returnTo') || params.get('redirect') || '';
    return raw.startsWith('/') && !raw.startsWith('//') ? raw : null;
  }, [params]);

  useEffect(() => {
    if (!isLoading && !user) {
      navigate(`/auth?redirect=${encodeURIComponent(location.pathname + location.search)}`, {
        replace: true,
      });
    }
  }, [isLoading, user, navigate, location]);

  const toggle = (intent: Intent) =>
    setSelected((current) =>
      current.includes(intent) ? current.filter((i) => i !== intent) : [...current, intent],
    );

  const proceed = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({ onboarded_at: new Date().toISOString() })
      .eq('id', user.id);
    if (error) {
      setSaving(false);
      toast.error("We couldn't save that. Please try again.");
      return;
    }
    if (returnTo) return navigate(returnTo, { replace: true });
    if (selected.includes('sell')) return navigate('/list', { replace: true });
    if (selected.length) return navigate('/search', { replace: true });
    navigate('/dashboard', { replace: true });
  };

  if (isLoading || !user) return <div className="v2-loading">Loading…</div>;

  return (
    <main className="v2-onboarding">
      <Helmet>
        <title>Welcome to Vendibook | Get started</title>
        <meta name="description" content="Tell Vendibook what you're here to do and get started." />
        <meta name="robots" content="noindex" />
      </Helmet>
      <Link to="/" aria-label="Vendibook home">
        <img src={logo} alt="Vendibook" className="h-8 w-auto" />
      </Link>
      <section className="v2-onboarding-panel">
        <p className="v2-eyebrow">Welcome to Vendibook</p>
        <h1>What are you here to do?</h1>
        <p>
          Pick anything that fits — you can do all of it later. This only sets your starting point.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {OPTIONS.map((option) => {
            const isSelected = selected.includes(option.key);
            return (
              <button
                key={option.key}
                type="button"
                onClick={() => toggle(option.key)}
                aria-pressed={isSelected}
                className={cn('v2-intent', isSelected && 'is-selected')}
              >
                <option.icon />
                <span>
                  <strong>{option.label}</strong>
                  <small>{option.hint}</small>
                </span>
                {isSelected ? <Check /> : <ArrowRight className="opacity-40" />}
              </button>
            );
          })}
        </div>
        <div className="mt-9 flex flex-wrap items-center gap-3">
          <button type="button" className="v2-btn-light" onClick={proceed} disabled={saving}>
            {saving && <Loader2 className="animate-spin" />}
            Continue
          </button>
          <Link to="/dashboard" className="v2-paypal-ghost">
            Skip for now
          </Link>
        </div>
      </section>
    </main>
  );
}
