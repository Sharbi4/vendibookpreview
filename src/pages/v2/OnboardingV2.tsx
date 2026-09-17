import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, Loader2, Search, Store } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import logo from '@/assets/vendibook-wordmark-light.png';
import { toast } from 'sonner';

type Intent = 'explore' | 'list';

export default function OnboardingV2() {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const [saving, setSaving] = useState<Intent | null>(null);
  const returnTo = useMemo(() => {
    const raw = params.get('returnTo') || params.get('redirect') || '';
    return raw.startsWith('/') && !raw.startsWith('//') ? raw : null;
  }, [params]);

  useEffect(() => {
    if (!isLoading && !user) navigate(`/auth?redirect=${encodeURIComponent(location.pathname + location.search)}`, { replace: true });
  }, [isLoading, user, navigate, location]);

  const choose = async (intent: Intent) => {
    if (!user) return;
    setSaving(intent);
    const { error } = await supabase.from('profiles').update({ onboarded_at: new Date().toISOString() }).eq('id', user.id);
    if (error) {
      setSaving(null);
      toast.error("We couldn't save your choice. Please try again.");
      return;
    }
    navigate(returnTo || (intent === 'list' ? '/list' : '/search'), { replace: true });
  };

  if (isLoading || !user) return <div className="v2-loading">Loading…</div>;
  return <main className="v2-onboarding">
    <Link to="/" aria-label="Vendibook home"><img src={logo} alt="Vendibook" className="h-8 w-auto" /></Link>
    <section className="v2-onboarding-panel">
      <p className="v2-eyebrow">Welcome to Vendibook</p>
      <h1>What would you like to do first?</h1>
      <p>This only chooses your starting point. You can buy, rent, sell, and list anytime.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <button className="v2-intent" onClick={() => choose('explore')} disabled={saving !== null}><Search /><span><strong>I’m looking to buy or rent</strong><small>Explore trucks, trailers, kitchens, and spaces</small></span>{saving === 'explore' ? <Loader2 className="animate-spin" /> : <ArrowRight />}</button>
        <button className="v2-intent" onClick={() => choose('list')} disabled={saving !== null}><Store /><span><strong>I want to list, sell, or rent out</strong><small>Start with the existing listing flow</small></span>{saving === 'list' ? <Loader2 className="animate-spin" /> : <ArrowRight />}</button>
      </div>
      <Button asChild variant="ghost"><Link to="/dashboard-v2">Go to my workspace</Link></Button>
    </section>
  </main>;
}