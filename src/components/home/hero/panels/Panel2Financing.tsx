import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import HeroPanelShell from './HeroPanelShell';
import { trackLeadEvent } from '@/lib/leadTracking';
import bgImage from '@/assets/hero-financing-bg.jpg';

const PRIMARY = '/search?utm_source=homepage&utm_medium=hero&utm_campaign=financing&utm_content=browse_eligible_listings';
const SECONDARY = '/how-it-works?utm_source=homepage&utm_medium=hero&utm_campaign=financing&utm_content=learn_how_it_works';

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
      bgImage={bgImage}
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
    />
  );
};

export default Panel2Financing;
