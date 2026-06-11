import { Link } from 'react-router-dom';
import HeroPanelShell from './HeroPanelShell';
import { Button } from '@/components/ui/button';
import { trackLeadEvent } from '@/lib/leadTracking';
import mock from '@/assets/hero-financing-mock.png.asset.json';

const Panel2Financing = () => (
  <HeroPanelShell
    bgImage={mock.url}
    eyebrow="Flexible starting paths"
    headline="Start with the truck before you commit to ownership"
    supportingText="Explore food trucks and trailers with flexible payment options available on eligible listings, including financing support through partners like Affirm or Afterpay where offered."
    finePrint="Payment options are subject to eligibility, provider approval, availability, and participating listings. Terms may vary."
    primaryCta={
      <Button
        asChild
        size="lg"
        className="rounded-full"
        onClick={() => trackLeadEvent('homepage_browse_click' as any, { source: 'home_hero', route: '/' })}
      >
        {/* TODO: add a payment_options filter on /search */}
        <Link to="/search?utm_source=homepage&utm_medium=hero&utm_campaign=financing&utm_content=browse_eligible_listings">
          Browse Eligible Listings
        </Link>
      </Button>
    }
    secondaryCta={
      <Button
        asChild
        size="lg"
        variant="outline"
        className="rounded-full bg-white/5 border-white/20 text-foreground hover:bg-white/10"
        onClick={() => trackLeadEvent('homepage_how_it_works_click' as any, { source: 'home_hero', route: '/' })}
      >
        <Link to="/how-it-works?utm_source=homepage&utm_medium=hero&utm_campaign=financing&utm_content=learn_how_it_works">
          Learn How It Works
        </Link>
      </Button>
    }
  />
);

export default Panel2Financing;
