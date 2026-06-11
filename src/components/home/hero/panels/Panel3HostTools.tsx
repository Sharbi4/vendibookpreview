import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import HeroPanelShell from './HeroPanelShell';
import { trackLeadEvent } from '@/lib/leadTracking';
import bgImage from '@/assets/hero-hosttools-bg.jpg';

const PRIMARY = '/host-tools?utm_source=homepage&utm_medium=hero&utm_campaign=host_tools&utm_content=explore_host_tools';
const SECONDARY = '/how-it-works/hosting?utm_source=homepage&utm_medium=hero&utm_campaign=host_tools&utm_content=how_hosting_works';

const Panel3HostTools = () => {
  const navigate = useNavigate();

  const handlePrimary = () => {
    trackLeadEvent('hero_host_tools_clicked', { cta_label: 'Explore Host Tools', destination: PRIMARY });
    navigate(PRIMARY);
  };
  const handleSecondary = () => {
    trackLeadEvent('hero_host_tools_clicked', { cta_label: 'How Hosting Works', destination: SECONDARY });
    navigate(SECONDARY);
  };

  return (
    <HeroPanelShell
      bgImage={bgImage}
      eyebrow="Tools for owners and hosts"
      headline={
        <>
          More than listings. <span className="gradient-text-warm">Built for food truck hosts.</span>
        </>
      }
      supportingText="List your truck, manage renter interest, organize documents, support equipment care, and create a more structured rental process from one place."
      primaryCta={
        <Button onClick={handlePrimary} size="lg" variant="dark-shine" className="rounded-full px-6 gap-2 whitespace-nowrap">
          Explore Host Tools <ArrowRight className="w-4 h-4" />
        </Button>
      }
      secondaryCta={
        <Button onClick={handleSecondary} size="lg" variant="glass-cta" className="rounded-full px-6 whitespace-nowrap">
          How Hosting Works
        </Button>
      }
    />
  );
};

export default Panel3HostTools;
