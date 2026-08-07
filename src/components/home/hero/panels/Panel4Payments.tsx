import { Link } from 'react-router-dom';
import { Lock, ShieldCheck, Truck } from 'lucide-react';
import HeroPanelShell from './HeroPanelShell';
import GlassCard from './GlassCard';
import { Button } from '@/components/ui/button';
import { trackLeadEvent } from '@/lib/leadTracking';
import paymentsBg from '@/assets/hero-payments-bg.png.asset.json';

const FeatureRow = ({ icon: Icon, title, text }: { icon: typeof Lock; title: string; text: string }) => (
  <GlassCard className="!p-3">
    <div className="flex items-start gap-3">
      <div className="w-9 h-9 rounded-lg bg-orange-100 flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-orange-600" />
      </div>
      <div className="min-w-0">
        <div className="text-sm font-semibold text-neutral-900">{title}</div>
        <div className="text-xs text-neutral-600 leading-snug">{text}</div>
      </div>
    </div>
  </GlassCard>
);

const PaymentsBelow = () => (
  <div className="grid gap-2 max-w-md">
    <FeatureRow icon={Lock} title="Secure checkout" text="Encrypted and protected payments" />
    <FeatureRow icon={ShieldCheck} title="Optional payment protection" text="Hold funds until both sides complete the deal" />
    <FeatureRow icon={Truck} title="Delivery coordination" text="Track and manage delivery where available" />
  </div>
);

const PaymentsModule = () => (
  <GlassCard className="w-[230px] !p-5" rotate={-2}>
    <div className="text-xs text-neutral-600 mb-1">Powered by</div>
    <div className="text-lg font-semibold text-neutral-800 mb-3">PayPal</div>
    <div className="flex items-start gap-2 pt-3 border-t border-orange-200/50">
      <ShieldCheck className="w-4 h-4 text-orange-500 mt-0.5 shrink-0" />
      <div className="text-xs text-neutral-700 leading-snug">
        Industry-leading<br />payment security
      </div>
    </div>
  </GlassCard>
);

const PaymentsModules = () => (
  <div className="hidden md:block absolute top-1/2 right-8 -translate-y-1/2 pointer-events-auto">
    <PaymentsModule />
  </div>
);

const Panel4Payments = () => (
  <HeroPanelShell
    bgImage={paymentsBg.url}
    glassModules={<PaymentsModules />}
    eyebrow="Trusted transaction support"
    headline={<>Accept payments with <span className="text-orange-600">more confidence</span></>}
    supportingText="Support in-person or online payments through Vendibook, with secure checkout, optional payment protection-style workflows, and delivery coordination where available."
    belowSupporting={<PaymentsBelow />}
    finePrint="Features may vary by listing type, transaction flow, eligibility, and availability."
    primaryCta={
      <Button
        asChild
        size="lg"
        className="flex-1 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/30 h-14 text-base font-semibold"
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
        className="flex-1 rounded-full border-neutral-900/25 bg-white/80 text-neutral-900 hover:bg-white h-14 text-base font-semibold shadow-md"
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
