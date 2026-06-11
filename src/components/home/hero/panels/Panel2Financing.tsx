import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import HeroPanelShell from './HeroPanelShell';
import { trackLeadEvent } from '@/lib/leadTracking';

const PRIMARY = '/search?utm_source=homepage&utm_medium=hero&utm_campaign=financing&utm_content=browse_eligible_listings';
const SECONDARY = '/how-it-works?utm_source=homepage&utm_medium=hero&utm_campaign=financing&utm_content=learn_how_it_works';

const PartnerBadge = ({ label }: { label: string }) => (
  <div className="relative overflow-hidden rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 backdrop-blur-sm">
    <span
      className="block text-sm font-semibold tracking-tight text-foreground/90"
      style={{
        backgroundImage:
          'linear-gradient(110deg, rgba(255,255,255,0.55) 20%, rgba(255,255,255,1) 50%, rgba(255,255,255,0.55) 80%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundSize: '200% 100%',
        animation: 'satin-sheen 4s linear infinite',
      }}
    >
      {label}
    </span>
  </div>
);

const Panel2Financing = () => {
  const navigate = useNavigate();

  const handlePrimary = () => {
    trackLeadEvent('hero_financing_clicked', { cta_label: 'Browse Eligible Listings', destination: PRIMARY });
    navigate(PRIMARY);
  };
  const handleSecondary = () => {
    trackLeadEvent('hero_financing_clicked', { cta_label: 'Learn How It Works', destination: SECONDARY });
    navigate(SECONDARY);
  };

  return (
    <HeroPanelShell
      accentClassName="bg-[radial-gradient(ellipse_at_30%_40%,rgba(255,81,36,0.18)_0%,transparent_55%)]"
      eyebrow="Flexible starting paths"
      headline={
        <>
          Start with the truck <span className="gradient-text-warm">before you commit to ownership</span>
        </>
      }
      supportingText="Explore food trucks and trailers with flexible payment options available on eligible listings, including financing support through partners like Affirm or Afterpay where offered."
      primaryCta={
        <Button onClick={handlePrimary} size="lg" variant="dark-shine" className="rounded-full px-6 gap-2 whitespace-nowrap">
          Browse Eligible Listings <ArrowRight className="w-4 h-4" />
        </Button>
      }
      secondaryCta={
        <Button onClick={handleSecondary} size="lg" variant="glass-cta" className="rounded-full px-6 whitespace-nowrap">
          Learn How It Works
        </Button>
      }
      finePrint="Payment options are subject to eligibility, provider approval, availability, and participating listings. Terms may vary."
      visual={
        <div className="relative w-full max-w-md">
          <style>{`@keyframes satin-sheen { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>
          <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#1a0e08] via-[#0f0907] to-[#08080a] p-6 shadow-2xl">
            <div className="text-[10px] uppercase tracking-[0.18em] text-foreground/50 mb-4">Partners where available</div>
            <div className="grid grid-cols-1 gap-2.5">
              <PartnerBadge label="Stripe" />
              <PartnerBadge label="Affirm" />
              <PartnerBadge label="Afterpay" />
            </div>
            <div className="mt-5 flex flex-wrap gap-1.5">
              <span className="text-[10px] text-foreground/60 px-2 py-1 rounded-full border border-white/10 bg-white/[0.03]">Lower upfront friction</span>
              <span className="text-[10px] text-foreground/60 px-2 py-1 rounded-full border border-white/10 bg-white/[0.03]">Test before buying outright</span>
            </div>
          </div>
        </div>
      }
    />
  );
};

export default Panel2Financing;
