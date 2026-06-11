import { Link } from 'react-router-dom';
import { Heart, Truck, MapPin } from 'lucide-react';
import HeroPanelShell from './HeroPanelShell';
import HeroSearchForm from './HeroSearchForm';
import GlassCard from './GlassCard';
import { Button } from '@/components/ui/button';
import { trackLeadEvent } from '@/lib/leadTracking';
import marketplaceBg from '@/assets/hero-marketplace-bg.png.asset.json';

const MarketplaceModules = () => (
  <>
    {/* Floating listing card — desktop right-center */}
    <div className="hidden md:block absolute top-1/2 right-8 -translate-y-1/2 w-[260px] pointer-events-auto">
      <GlassCard rotate={-3}>
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-orange-100 to-orange-200 flex items-center justify-center shrink-0">
            <Truck className="w-7 h-7 text-orange-600" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-bold uppercase tracking-wider text-orange-600 mb-0.5">
              New Listing
            </div>
            <div className="text-sm font-semibold text-neutral-900 truncate">
              Fully Equipped Taco Truck
            </div>
            <div className="text-xs text-neutral-600 flex items-center gap-1 mt-0.5">
              <MapPin className="w-3 h-3" /> Austin, TX
            </div>
          </div>
          <Heart className="w-4 h-4 text-orange-500 shrink-0" />
        </div>
      </GlassCard>
    </div>
  </>
);

const Panel1Marketplace = () => (
  <HeroPanelShell
    bgImage={marketplaceBg.url}
    glassModules={<MarketplaceModules />}
    eyebrow="The marketplace for mobile food assets"
    headline={<>Find, rent, buy, or sell <span className="text-orange-600">food trucks and food trailers</span></>}
    supportingText="Search verified food trucks and trailers, compare real listings, and connect with owners through a safer, more structured marketplace."
    primaryCta={
      <div className="w-full flex flex-col">
        <HeroSearchForm />
        <p className="mt-[18px] text-[15px] sm:text-base text-[#4A403A] text-left">
          Have a truck or trailer?{' '}
          <Link
            to="/list?utm_source=homepage&utm_medium=hero&utm_campaign=homepage_conversion&utm_content=list_it_free"
            className="font-semibold underline underline-offset-4 hover:opacity-80"
            style={{ color: '#FF4B1F' }}
            onClick={() => trackLeadEvent('homepage_host_list_click' as any, { source: 'home_hero', route: '/' })}
          >
            List it free →
          </Link>
        </p>
        <div className="mt-[18px] flex flex-col gap-3 w-full">
          <Link
            to="/auth?mode=signup&utm_source=homepage&utm_medium=hero&utm_campaign=homepage_conversion&utm_content=signup_free"
            onClick={() => trackLeadEvent('homepage_primary_cta_click' as any, { source: 'home_hero', route: '/' })}
            className="w-full h-[58px] inline-flex items-center justify-center rounded-full text-white text-[18px] font-bold active:scale-[0.98] transition-all"
            style={{
              background: 'linear-gradient(135deg, #FF4B1F 0%, #FF6726 100%)',
              boxShadow: '0 14px 32px rgba(255,75,31,0.32)',
            }}
          >
            Sign Up Free
          </Link>
          <Link
            to="/search?category=food_truck%2Cfood_trailer&utm_source=homepage&utm_medium=hero&utm_campaign=homepage_conversion&utm_content=browse_trucks_trailers"
            onClick={() => trackLeadEvent('homepage_browse_click' as any, { source: 'home_hero', route: '/' })}
            className="w-full h-[58px] inline-flex items-center justify-center rounded-full text-white text-[18px] font-bold active:scale-[0.98] transition-all"
            style={{
              background: '#111111',
              border: '1px solid rgba(255,255,255,0.12)',
              boxShadow: '0 10px 24px rgba(0,0,0,0.20)',
            }}
          >
            Browse Trucks &amp; Trailers
          </Link>
        </div>
      </div>
    }
  />
);

export default Panel1Marketplace;
