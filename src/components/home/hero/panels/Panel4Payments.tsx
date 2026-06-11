import { Link } from 'react-router-dom';
import HeroPanelShell from './HeroPanelShell';
import { Button } from '@/components/ui/button';
import { trackLeadEvent } from '@/lib/leadTracking';
import paymentsBg from '@/assets/hero-payments-bg.png.asset.json';

const Panel4Payments = () => (
  <HeroPanelShell
    bgImage={paymentsBg.url}
    eyebrow="Trusted transaction support"
    headline={<>Accept payments with <span className="text-orange-600">more confidence</span></>}
    supportingText="Support in-person or online payments through Vendibook, with secure checkout, optional escrow-style workflows, and delivery coordination where available."
    finePrint="Features may vary by listing type, transaction flow, eligibility, and availability."
    primaryCta={
      <Button
        asChild
        size="lg"
        className="flex-1 rounded-full bg-orange-500 hover:bg-orange-600 text-white shadow-md"
        onClick={() => trackLeadEvent('homepage_how_it_works_click' as any, { source: 'home_hero', route: '/' })}
      >
        <Link to="/how-it-works?utm_source=homepage&utm_medium=hero&utm_campaign=payments&utm_content=learn_more">
          Learn More
        </Link>
      </Button>
    }
    secondaryCta={
      <Button
        asChild
        size="lg"
        variant="outline"
        className="flex-1 rounded-full border-neutral-900/20 bg-white/70 text-neutral-900 hover:bg-white"
        onClick={() => trackLeadEvent('homepage_browse_click' as any, { source: 'home_hero', route: '/' })}
      >
        <Link to="/search?utm_source=homepage&utm_medium=hero&utm_campaign=payments&utm_content=browse_listings">
          Browse Listings
        </Link>
      </Button>
    }
  />
);

export default Panel4Payments;
