import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import HeroPanelShell from './HeroPanelShell';
import { trackLeadEvent } from '@/lib/leadTracking';
import bgImage from '@/assets/hero-payments-bg.jpg';

const PRIMARY = '/how-it-works?utm_source=homepage&utm_medium=hero&utm_campaign=payments&utm_content=learn_more';
const SECONDARY = '/search?utm_source=homepage&utm_medium=hero&utm_campaign=payments&utm_content=browse_listings';

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
      bgImage={bgImage}
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
    />
  );
};

export default Panel4Payments;
