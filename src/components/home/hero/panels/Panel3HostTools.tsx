import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, FileText, Calendar, Sparkle, ShieldCheck } from 'lucide-react';
import HeroPanelShell from './HeroPanelShell';
import { trackLeadEvent } from '@/lib/leadTracking';

const PRIMARY = '/host-tools?utm_source=homepage&utm_medium=hero&utm_campaign=host_tools&utm_content=explore_host_tools';
const SECONDARY = '/how-it-works/hosting?utm_source=homepage&utm_medium=hero&utm_campaign=host_tools&utm_content=how_hosting_works';

const CARDS = [
  { icon: Sparkle, label: 'Cleaning workflow' },
  { icon: FileText, label: 'Document collection' },
  { icon: Calendar, label: 'Booking requests' },
  { icon: ShieldCheck, label: 'Owner-approved rentals' },
];

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
      visual={
        <div className="grid grid-cols-2 gap-3 w-full max-w-md">
          {CARDS.map(({ icon: Icon, label }) => (
            <div
              key={label}
              className="rounded-xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur-sm hover:bg-white/[0.05] transition-colors"
            >
              <Icon className="w-5 h-5 text-primary mb-2" />
              <div className="text-xs font-semibold text-foreground/90">{label}</div>
            </div>
          ))}
        </div>
      }
    />
  );
};

export default Panel3HostTools;
