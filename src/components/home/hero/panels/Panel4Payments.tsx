import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, Lock, CreditCard, Truck, ShieldCheck } from 'lucide-react';
import HeroPanelShell from './HeroPanelShell';
import { trackLeadEvent } from '@/lib/leadTracking';

const PRIMARY = '/how-it-works?utm_source=homepage&utm_medium=hero&utm_campaign=payments&utm_content=learn_more';
const SECONDARY = '/search?utm_source=homepage&utm_medium=hero&utm_campaign=payments&utm_content=browse_listings';

const CHIPS = [
  { icon: Lock, label: 'Secure checkout' },
  { icon: ShieldCheck, label: 'Optional escrow workflow' },
  { icon: Truck, label: 'Delivery coordination' },
  { icon: CreditCard, label: 'Owner-approved terms' },
];

const Panel4Payments = () => {
  const navigate = useNavigate();

  const handlePrimary = () => {
    trackLeadEvent('hero_payments_clicked', { cta_label: 'Learn More', destination: PRIMARY });
    navigate(PRIMARY);
  };
  const handleSecondary = () => {
    trackLeadEvent('hero_payments_clicked', { cta_label: 'Browse Listings', destination: SECONDARY });
    navigate(SECONDARY);
  };

  return (
    <HeroPanelShell
      accentClassName="bg-[radial-gradient(ellipse_at_70%_50%,rgba(255,81,36,0.12)_0%,transparent_55%)]"
      eyebrow="Trusted transaction support"
      headline={
        <>
          Accept payments with <span className="gradient-text-warm">more confidence</span>
        </>
      }
      supportingText="Support in-person or online payments through Vendibook, with secure checkout, optional escrow-style workflows, and delivery coordination where available."
      primaryCta={
        <Button onClick={handlePrimary} size="lg" variant="dark-shine" className="rounded-full px-6 gap-2 whitespace-nowrap">
          Learn More <ArrowRight className="w-4 h-4" />
        </Button>
      }
      secondaryCta={
        <Button onClick={handleSecondary} size="lg" variant="glass-cta" className="rounded-full px-6 whitespace-nowrap">
          Browse Listings
        </Button>
      }
      finePrint="Features may vary by listing type, transaction flow, eligibility, and availability."
      visual={
        <div className="relative w-full max-w-md">
          <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#0f0907] to-[#08080a] p-5 shadow-2xl">
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 mb-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/15 border border-primary/30 flex items-center justify-center">
                  <Lock className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <div className="text-xs text-foreground/60">Secure checkout</div>
                  <div className="text-sm font-semibold text-foreground">Payment authorized</div>
                </div>
              </div>
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              {CHIPS.map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-2">
                  <Icon className="w-3.5 h-3.5 text-foreground/70" />
                  <span className="text-[11px] text-foreground/80">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      }
    />
  );
};

export default Panel4Payments;
