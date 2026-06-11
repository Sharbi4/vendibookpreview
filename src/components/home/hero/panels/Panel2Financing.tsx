import { Link } from 'react-router-dom';
import HeroPanelShell from './HeroPanelShell';
import GlassCard from './GlassCard';
import { Button } from '@/components/ui/button';
import { trackLeadEvent } from '@/lib/leadTracking';
import { AffirmWordmark, AfterpayWordmark } from './BrandWordmarks';
import { CheckCircle2 } from 'lucide-react';
import financingBg from '@/assets/hero-financing-bg.png.asset.json';

const LogoRow = () => (
  <GlassCard className="!p-4 max-w-sm">
    <div className="flex items-center justify-around gap-3">
      <AffirmWordmark className="text-2xl" />
      <div className="h-7 w-px bg-neutral-300/70" />
      <AfterpayWordmark className="text-2xl" />
    </div>
  </GlassCard>
);

const FinancingModules = () => (
  <div className="hidden md:block absolute top-1/2 right-8 -translate-y-1/2 w-[280px] pointer-events-auto">
    <GlassCard rotate={2}>
      <div className="text-[10px] font-bold uppercase tracking-wider text-orange-600 mb-2">
        Eligible listing
      </div>
      <div className="flex items-start gap-2 mb-1.5">
        <CheckCircle2 className="w-4 h-4 text-orange-500 mt-0.5 shrink-0" />
        <span className="text-sm font-semibold text-neutral-900">Flexible payment options</span>
      </div>
      <div className="text-xs text-neutral-600 pl-6">Subject to approval</div>
    </GlassCard>
  </div>
);

const Panel2Financing = () => (
  <HeroPanelShell
    bgImage={financingBg.url}
    glassModules={<FinancingModules />}
    eyebrow="Flexible starting paths"
    headline={<>Start with the truck before you <span className="text-orange-600">commit to ownership</span></>}
    supportingText="Explore food trucks and trailers with flexible payment options available on eligible listings, including financing support through partners like Affirm or Afterpay where offered."
    belowSupporting={<LogoRow />}
    finePrint="Payment options are subject to eligibility, provider approval, availability, and participating listings. Terms may vary."
    primaryCta={
      <Button
        asChild
        size="lg"
        className="flex-1 rounded-full bg-orange-500 hover:bg-orange-600 text-white shadow-md"
        onClick={() => trackLeadEvent('homepage_browse_click' as any, { source: 'home_hero', route: '/' })}
      >
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
        className="flex-1 rounded-full border-neutral-900/20 bg-white/70 text-neutral-900 hover:bg-white"
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
