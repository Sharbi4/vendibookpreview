import { Link } from 'react-router-dom';
import HeroPanelShell from './HeroPanelShell';
import HeroSearchForm from './HeroSearchForm';
import { Button } from '@/components/ui/button';
import { trackLeadEvent } from '@/lib/leadTracking';
import marketplaceBg from '@/assets/hero-marketplace-bg.png.asset.json';

const Panel1Marketplace = () => (
  <HeroPanelShell
    bgImage={marketplaceBg.url}
    eyebrow="The marketplace for mobile food assets"
    headline={<>Find, rent, buy, or sell <span className="text-orange-600">food trucks and food trailers</span></>}
    supportingText="Search verified food trucks and trailers, compare real listings, and connect with owners through a safer, more structured marketplace."
    primaryCta={
      <div className="w-full flex flex-col gap-3">
        <HeroSearchForm />
        <p className="text-sm text-neutral-700 text-center sm:text-left">
          Have a truck or trailer?{' '}
          {/* TODO: dedicated /list-your-food-truck route — using /list */}
          <Link
            to="/list?utm_source=homepage&utm_medium=hero&utm_campaign=homepage_conversion&utm_content=list_it_free"
            className="text-orange-600 font-semibold underline underline-offset-4 hover:text-orange-700"
            onClick={() => trackLeadEvent('homepage_host_list_click' as any, { source: 'home_hero', route: '/' })}
          >
            List it free →
          </Link>
        </p>
        <div className="flex flex-col sm:flex-row gap-2 w-full">
          {/* TODO: dedicated /signup route — using /auth?mode=signup */}
          <Button
            asChild
            size="lg"
            className="flex-1 rounded-full bg-orange-500 hover:bg-orange-600 text-white shadow-md"
            onClick={() => trackLeadEvent('homepage_primary_cta_click' as any, { source: 'home_hero', route: '/' })}
          >
            <Link to="/auth?mode=signup&utm_source=homepage&utm_medium=hero&utm_campaign=homepage_conversion&utm_content=signup_free">
              Sign Up Free
            </Link>
          </Button>
          <Button
            asChild
            size="lg"
            className="flex-1 rounded-full bg-neutral-900 hover:bg-neutral-800 text-white"
            onClick={() => trackLeadEvent('homepage_browse_click' as any, { source: 'home_hero', route: '/' })}
          >
            <Link to="/search?category=food_truck%2Cfood_trailer&utm_source=homepage&utm_medium=hero&utm_campaign=homepage_conversion&utm_content=browse_trucks_trailers">
              Browse Trucks &amp; Trailers
            </Link>
          </Button>
        </div>
      </div>
    }
  />
);

export default Panel1Marketplace;
