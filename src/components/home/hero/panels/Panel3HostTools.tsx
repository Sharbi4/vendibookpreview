import { Link } from 'react-router-dom';
import HeroPanelShell from './HeroPanelShell';
import { Button } from '@/components/ui/button';
import { trackLeadEvent } from '@/lib/leadTracking';

const Panel3HostTools = () => (
  <HeroPanelShell
    eyebrow="Tools for owners and hosts"
    headline={<>More than listings. Built for <span className="text-orange-600">food truck hosts.</span></>}
    supportingText="List your truck, manage renter interest, organize documents, support equipment care, and create a more structured rental process from one place."
    primaryCta={
      <Button
        asChild
        size="lg"
        className="flex-1 rounded-full bg-orange-500 hover:bg-orange-600 text-white shadow-md"
        onClick={() => trackLeadEvent('homepage_host_list_click' as any, { source: 'home_hero', route: '/' })}
      >
        {/* TODO: dedicated /host-tools route — using /tools */}
        <Link to="/tools?utm_source=homepage&utm_medium=hero&utm_campaign=host_tools&utm_content=explore_host_tools">
          Explore Host Tools
        </Link>
      </Button>
    }
    secondaryCta={
      <Button
        asChild
        size="lg"
        variant="outline"
        className="flex-1 rounded-full border-neutral-900/20 bg-white/70 text-neutral-900 hover:bg-white"
        onClick={() => trackLeadEvent('homepage_how_it_works_click' as any, { source: 'home_hero', route: '/' })}
      >
        <Link to="/how-it-works-host?utm_source=homepage&utm_medium=hero&utm_campaign=host_tools&utm_content=how_hosting_works">
          How Hosting Works
        </Link>
      </Button>
    }
  />
);

export default Panel3HostTools;
